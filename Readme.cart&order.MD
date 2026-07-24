# Cart & Order Modules — API Documentation

Cart आणि Order हे दोन्ही एकत्र document केले आहेत कारण checkout flow मध्ये cart → order
असं directly convert होतं.

> ### 🔄 Update: Item-level status + return workflow
> Order schema मध्ये पुढील बदल झाले आहेत:
> - प्रत्येक order item ला आता स्वतःचा `itemStatus` आहे: `active` → `cancelled` /
>   `return_requested` → `return_approved` → `returned` → `refunded`
> - `orderStatus` मध्ये `"processing"` नवीन value add झाली (placed → confirmed → **processing** → shipped → delivered)
> - `paymentStatus` मध्ये `"partially_refunded"` नवीन value add झाली (item-level refunds साठी)
> - `cancelReason` (flat field) च्या ऐवजी आता पूर्ण `cancellation { isCancelled, reason, cancelledAt, cancelledBy }` object आहे
> - नवीन endpoints: single-item cancel, return request (user), return approval workflow (admin)
> — खाली सगळे details दिले आहेत.

---

## 📁 Files Created

```
backend/src/
├── models/cart.model.js
├── models/order.model.js
├── models/counter.model.js              // atomic order-number sequence generator
├── controller/cart.controller.js
├── controller/order.controller.js
├── routes/cart.routes.js
├── routes/order.routes.js
├── validations/cart.validation.js
├── validations/order.validation.js
```

---

## 🛒 CART

### Schema
| Field   | Type     | Notes                                                     |
|---------|----------|-------------------------------------------------------------|
| `user`  | ObjectId | one cart per user (`unique` index)                          |
| `items` | Array    | each item: `product`, `quantity`, `priceAtAddTime`, `size`  |
| `updatedAt` | Date | auto via `timestamps`                                       |

Cart वर कधीच admin access नाही — फक्त तोच user बघू/बदलू शकतो जो logged-in आहे.

### API Endpoints — Base: `/api/cart` (सगळे routes login आवश्यक)

| Method | Endpoint            | Description                                      |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/`                    | Get cart (with live product info + price/stock flags) |
| POST   | `/items`               | Add item (`productId`, `quantity`, `size`)         |
| PUT    | `/items/:itemId`       | Update quantity of one item                        |
| DELETE | `/items/:itemId`       | Remove one item                                    |
| DELETE | `/`                    | Clear entire cart                                  |

### Cart Behavior
- **Same product + same size** already in cart → quantity **increments** instead of duplicate row.
- हर वेळी `GET /` केल्यावर, current product price (`finalPrice`) आणि `priceAtAddTime` compare करून
  `priceChanged: true/false` flag पाठवतो — frontend "price updated" banner दाखवू शकतो.
- `outOfStock: true` flag पण मिळतो जर product inactive झाला किंवा stock quantity पेक्षा कमी झाला.
- Stock नेहमी add/update वेळी check होतो — जास्त quantity add करता येत नाही.

---

## 📦 ORDER

### Schema highlights
| Field              | Notes                                                                 |
|---------------------|------------------------------------------------------------------------|
| `orderNumber`       | Auto: `ORD-2026-00123` — **atomic counter** (`counter.model.js`), gap-free per year |
| `items[]`           | Full snapshot (`name`, `image`, `metalType`, `size`, `priceAtOrderTime`) + own `itemStatus` |
| `items[].itemStatus`| `active` → `cancelled` \| `return_requested` → `return_approved` → `returned` → `refunded` |
| `shippingAddress`   | **Full copy**, address reference नाही (user नंतर address edit/delete करू शकतो) |
| `pricing`           | `subtotal`, `couponDiscount`, `shippingCharge`, `totalAmount` — item cancel झाल्यावर subtotal/total auto-recalculate होतं |
| `paymentMethod`     | `card` \| `upi` \| `cod`                                              |
| `paymentStatus`     | `pending` \| `paid` \| `failed` \| `refunded` \| `partially_refunded` |
| `orderStatus`       | `placed` \| `confirmed` \| `processing` \| `shipped` \| `delivered` \| `cancelled` |
| `statusHistory[]`   | प्रत्येक status change चा `{status, timestamp, note}` — order tracking timeline साठी |
| `cancellation`      | `{ isCancelled, reason, cancelledAt, cancelledBy: "user"\|"admin" }` — फक्त order cancel झाल्यावर भरतं |

### API Endpoints — Base: `/api/orders` (सगळे routes login आवश्यक)

| Method | Endpoint                                | Access | Description                             |
|--------|--------------------------------------------|--------|--------------------------------------------|
| POST   | `/`                                         | User   | **Checkout** — cart → order                |
| GET    | `/my`                                      | User   | My orders (paginated, filter by status)    |
| GET    | `/number/:orderNumber`                      | User/Admin | Get order by `ORD-2026-00123`          |
| GET    | `/:id`                                      | User/Admin | Get order by id                        |
| PATCH  | `/:id/cancel`                               | User/Admin | Cancel **entire** order (all items)    |
| PATCH  | `/:id/items/:itemId/cancel`                 | User/Admin | Cancel **one item** only               |
| PATCH  | `/:id/items/:itemId/return-request`         | User   | Request return for a delivered item        |
| GET    | `/admin/all`                                | Admin  | All orders (filters + search)              |
| PATCH  | `/:id/status`                               | Admin  | Update fulfillment status                  |
| PATCH  | `/:id/payment-status`                       | Admin  | Update payment status                      |
| PATCH  | `/:id/items/:itemId/return-status`          | Admin  | Progress return: approve → returned → refunded |

---

## 🔁 Checkout Flow (`POST /api/orders`)

Request body:
```json
{
  "addressId": "64f1c2a9e1b2c3a4d5e6f7a8",
  "paymentMethod": "upi",
  "couponDiscount": 0
}
```

Step by step (सगळं एका **MongoDB transaction** मध्ये — कुठेही fail झालं तर पूर्ण rollback):

1. दिलेला `addressId` त्याच user चा आहे का check.
2. User चा cart fetch — रिकामा असेल तर error.
3. प्रत्येक cart item साठी: product active आहे का + पुरेसा stock आहे का check.
4. प्रत्येक item चा **current** `finalPrice` freeze करून `priceAtOrderTime` म्हणून save (cart मधल्या जुन्या price ऐवजी — ensures latest price charge होते).
5. Address चं पूर्ण snapshot घेऊन `shippingAddress` मध्ये copy.
6. `subtotal` calculate, shipping charge rule apply (**₹2000 च्या वर free, नाहीतर ₹99 flat** — गरजेप्रमाणे बदलता येईल), `totalAmount` calculate.
7. Order create (orderNumber auto).
8. प्रत्येक product चा `stock` decrement.
9. Cart empty कर.

जर मध्येच कुठे stock कमी पडला किंवा काही error आला — transaction मुळे **काहीही partial save होत नाही**, cart तसाच राहतो.

### Response `201`
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderNumber": "ORD-2026-00001",
    "items": [
      {
        "name": "Gold Kundan Necklace",
        "image": "https://res.cloudinary.com/...",
        "metalType": "gold",
        "size": "",
        "quantity": 1,
        "priceAtOrderTime": 44175
      }
    ],
    "shippingAddress": { "fullName": "Rohan Sharma", "city": "Pune", "...": "..." },
    "pricing": { "subtotal": 44175, "couponDiscount": 0, "shippingCharge": 0, "totalAmount": 44175 },
    "paymentMethod": "upi",
    "paymentStatus": "pending",
    "orderStatus": "placed",
    "statusHistory": [{ "status": "placed", "changedAt": "..." }]
  }
}
```

---

## ⚠️ Important Notes

- **Whole-order cancel** (`/:id/cancel`) फक्त `placed` / `confirmed` / `processing` status मध्ये शक्य.
  सगळ्या active items चा stock restock होतो + `cancellation` object भरतो + orderStatus → `cancelled`.
- **Single-item cancel** (`/:id/items/:itemId/cancel`) — फक्त तो item cancel होतो, बाकी order तसाच राहतो.
  `pricing.subtotal`/`totalAmount` त्या item शिवाय auto-recalculate होतं. जर payment आधीच `paid` असेल,
  तर `paymentStatus` आपोआप `partially_refunded` होतो (actual refund gateway कडून वेगळं process करावं लागेल).
  जर order मधले **सगळे** items cancel झाले, तर संपूर्ण order पण आपोआप `cancelled` होतो.
- **Return flow** (फक्त `delivered` order वर): user → `return-request` → admin `return-status` ने
  पुढे न्यायचं: `return_approved` → `returned` (stock परत add होतो) → `refunded` (payment status update होतो).
  प्रत्येक transition strict order मध्येच होतो (skip करता येत नाही, उदा. request केल्याशिवाय directly `returned` नाही करता येत).
- **Order status machine**: `cancelled` किंवा `delivered` झाल्यावर पुढे orderStatus बदलता येत नाही.
- **Payment integration TODO**: `paymentMethod: "cod"` सोडून बाकी (`card`, `upi`) साठी प्रत्यक्ष
  Razorpay integration अजून बाकी आहे — `services/razorpay.service.js` बनवून
  payment success callback/webhook मधून `PATCH /:id/payment-status` call कर.
- **Coupon system**: सध्या `couponDiscount` client कडून raw number म्हणून घेतला जातोय (backend
  trust करतोय) — production साठी हे असुरक्षित आहे. Coupon module बनवून तिथून server-side
  validated discount calculate करावा लागेल, client कडून coupon amount कधीच trust करू नये.
- **Transactions**: MongoDB transactions साठी replica set/Atlas आवश्यक आहे — standalone local
  Mongo वर काम करत नाही (`mongod --replSet` local test साठी लागेल).

## 🧩 Dependencies
कुठलंही नवीन package नाही लागत — आधीच installed: `express`, `mongoose`, `joi`, `jsonwebtoken`