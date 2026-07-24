# Product Module — API Documentation

Jewellery products साठी complete CRUD + inventory + pricing logic.
प्रत्येक Product एका Category ला linked असतो.

---

## 📁 Files Created

```
backend/src/
├── models/product.model.js                    // schema + slug/sku auto-gen + finalPrice calc
├── controller/product.controller.js           // CRUD + stock + featured/status + related products
├── routes/product.routes.js                    // Express routes
├── validations/product.validation.js           // Joi schemas
├── middleware/parseJsonFields.middleware.js     // parses JSON strings from multipart form
```
(वापरलेले common files — `auth.middleware.js`, `admin.middleware.js`, `upload.middleware.js`,
`validate.middleware.js`, `cloudinary.service.js`, `apiResponse.js`, `apiError.js`, `asyncHandler.js` —
हे category module सोबत आधीच बनले आहेत, product routes तेच reuse करतात.)

---

## 🗂️ Product Schema

| Field            | Type       | Required | Default | Notes                                             |
|-------------------|------------|----------|---------|-----------------------------------------------------|
| `name`            | String     | ✅ Yes   | —       | 2–150 chars                                         |
| `slug`            | String     | Auto     | —       | Auto-generated from `name`                          |
| `description`     | String     | ❌ No    | `""`    | Max 2000 chars                                      |
| `category`        | ObjectId   | ✅ Yes   | —       | Must be an existing Category `_id`                  |
| `images`          | [String]   | ❌ No*   | `[]`    | Cloudinary URLs, max 8, uploaded via field `images`  |
| `metalType`       | String     | ✅ Yes   | —       | enum: `gold`, `silver`, `platinum`, `rosegold`       |
| `purity`          | String     | ❌ No    | `""`    | e.g. `"22K"`, `"925 Sterling"`                       |
| `weight`          | Number     | ✅ Yes   | —       | grams                                                |
| `stoneType`       | String     | ❌ No    | `"None"`| enum: `Pearl`, `Diamond`, `Kundan`, `Ruby`, `Emerald`, `None` |
| `makingCharges`   | Number     | ❌ No    | `0`     | flat amount                                          |
| `basePrice`       | Number     | ✅ Yes   | —       | metal/product base cost                              |
| `discount`        | Number     | ❌ No    | `0`     | percentage (0–100)                                   |
| `finalPrice`      | Number     | Auto     | `0`     | **Server-calculated**, see formula below             |
| `stock`           | Number     | ❌ No    | `0`     | available quantity                                   |
| `sku`             | String     | Auto*    | —       | unique; auto-generated if left blank                 |
| `sizeOptions`     | [String]   | ❌ No    | `[]`    | e.g. `["6", "7", "8"]` for rings                      |
| `isCustomizable`  | Boolean    | ❌ No    | `false` | ML/custom design feature (Phase 2) से link होईल      |
| `isFeatured`      | Boolean    | ❌ No    | `false` | homepage "Featured" section                          |
| `isActive`        | Boolean    | ❌ No    | `true`  | inactive = storefront वर hidden                       |
| `ratings.avgRating` | Number   | Auto     | `0`     | Review system update करेल (Phase 2)                  |
| `ratings.totalReviews` | Number | Auto   | `0`     | Review system update करेल                             |
| `createdBy`       | ObjectId   | Auto     | —       | logged-in admin                                       |

\* Image compulsory नाही schema level ला, पण frontend form validation ने required ठेवण्याची शिफारस.
\* SKU admin manually देऊ शकतो, नाहीतर auto-generate होतो (उदा. `GO-RING-4821`).

### 💰 `finalPrice` Formula
```
subtotal     = basePrice + makingCharges
discountAmt  = subtotal * (discount / 100)
finalPrice   = subtotal - discountAmt
```
हे `basePrice`, `makingCharges`, किंवा `discount` कधीही बदललं तरी auto-recalculate होतं — client ने `finalPrice` पाठवायची गरज नाही (पाठवलं तरी ignore होतं).

---

## 📝 Admin ने Product Add करताना काय भरायचं?

1. **Product Name** *(required)*
2. **Category** *(required dropdown)* — आधी बनवलेल्या categories मधून select (उदा. "Gold Necklace")
3. **Description** *(optional)*
4. **Images** *(recommended, max 8)* — jpeg/png/webp, 5MB per file
5. **Metal Type** *(required dropdown)* — Gold / Silver / Platinum / Rose Gold
6. **Purity** *(optional text)* — उदा. "22K", "925 Sterling"
7. **Weight (grams)** *(required number)*
8. **Stone Type** *(optional dropdown)* — Pearl / Diamond / Kundan / Ruby / Emerald / None
9. **Making Charges** *(optional number)* — flat ₹ amount
10. **Base Price** *(required number)*
11. **Discount %** *(optional number, 0–100)* — final price auto calculate होईल
12. **Stock Quantity** *(optional number)* — default 0
13. **SKU** *(optional)* — रिकामं सोडलं तर auto-generate होईल
14. **Size Options** *(optional, comma-separated)* — rings/bangles साठी उदा. "6, 7, 8"
15. **Customizable?** *(toggle)* — customer ला design customize करता येईल का
16. **Featured?** *(toggle)* — homepage वर दाखवायचं का
17. **Active?** *(toggle)* — default ON

> **Slug**, **finalPrice**, **ratings**, आणि **createdBy** — हे auto-handle होतात, admin ला भरायची गरज नाही.

---

## 🔌 API Endpoints

Base path: `/api/products`

| Method | Endpoint                      | Access     | Description                                  |
|--------|--------------------------------|------------|------------------------------------------------|
| GET    | `/`                             | Public     | List products (filters + search + pagination)  |
| GET    | `/slug/:slug`                   | Public     | Get one product by slug (detail page)          |
| GET    | `/:id`                          | Public     | Get one product by ID                          |
| GET    | `/:id/related`                  | Public     | Related products (same category)               |
| POST   | `/`                              | Admin only | Create product                                 |
| PUT    | `/:id`                          | Admin only | Update product (name/price/images/etc.)        |
| PATCH  | `/:id/stock`                    | Admin only | Increment / decrement / set stock              |
| PATCH  | `/:id/toggle-featured`          | Admin only | Quick featured on/off                          |
| PATCH  | `/:id/toggle-status`            | Admin only | Quick active/inactive                          |
| DELETE | `/:id`                          | Admin only | Delete product (+ removes Cloudinary images)   |

### `GET /` query params
`category` · `metalType` · `stoneType` · `purity` · `minPrice` · `maxPrice` · `isFeatured` · `isActive` · `inStock` (`true`) · `search` · `page` · `limit` · `sort`

### `PATCH /:id/stock` body
```json
{ "action": "decrement", "quantity": 2 }
```
`action`: `"increment"` | `"decrement"` | `"set"`

---

## 📦 Example: Create Product (POST `/api/products`)

Request — `multipart/form-data`:
```
name: Gold Kundan Necklace
category: 64f1c2a9e1b2c3a4d5e6f7a8
metalType: gold
purity: 22K
weight: 18.5
stoneType: Kundan
makingCharges: 1500
basePrice: 45000
discount: 5
stock: 10
sizeOptions: ["S","M","L"]        <-- JSON string (multipart quirk, parsed automatically)
isFeatured: true
images: <file1>, <file2>, ...
```

Response `201`:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "64f...",
    "name": "Gold Kundan Necklace",
    "slug": "gold-kundan-necklace",
    "category": "64f1c2a9e1b2c3a4d5e6f7a8",
    "images": ["https://res.cloudinary.com/.../products/a1.jpg"],
    "metalType": "gold",
    "purity": "22K",
    "weight": 18.5,
    "stoneType": "Kundan",
    "makingCharges": 1500,
    "basePrice": 45000,
    "discount": 5,
    "finalPrice": 44175,
    "stock": 10,
    "sku": "GO-GOLD-7241",
    "sizeOptions": ["S", "M", "L"],
    "isFeatured": true,
    "isActive": true,
    "ratings": { "avgRating": 0, "totalReviews": 0 },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## ⚠️ Important Notes

- **multipart/form-data quirk**: Array/object fields (`sizeOptions`, `keepImages`) file upload
  मुळे JSON string म्हणून पाठवावे लागतात — उदा. `sizeOptions: '["S","M","L"]'`.
  `parseJsonFields` middleware हे आपोआप parse करतो.
- **Updating images**: PUT request मध्ये existing images मधून काय ठेवायचं ते `keepImages`
  (array of URLs) म्हणून पाठव — जे URLs त्यात नाहीत ते Cloudinary वरून delete होतात.
  नवीन `images` files पाठवलीस तर त्या existing (kept) images मध्ये add होतात.
- **Delete guard TODO**: जेव्हा `order.model.js` बनवशील, तेव्हा `deleteProduct` मध्ये check
  add कर की product कुठल्या pending/active order मध्ये आहे का — असल्यास hard delete ऐवजी
  फक्त `isActive: false` कर.
- **Ratings**: `avgRating`/`totalReviews` हे review module (Phase 2) मधून update होतील,
  सध्या create/update API मधून directly edit करता येत नाहीत.

## 🧩 Dependencies (already installed with Category module)
```bash
npm install express mongoose multer cloudinary joi jsonwebtoken
```