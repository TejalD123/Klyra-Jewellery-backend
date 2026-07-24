# Category Module — API Documentation

Jewellery e-commerce साठी **Category** module. Category हा product classification चा base आहे —
उदा. Necklace, Ring, Earrings, आणि प्रत्येकाच्या आत Gold Necklace / Silver Necklace असे subcategories.

---

## 📁 Files Created

```
backend/src/
├── models/category.model.js           // Mongoose schema + slug auto-generate
├── controller/category.controller.js  // CRUD + tree + subcategories logic
├── routes/category.routes.js           // Express routes
├── routes/index.routes.js              // mounts /api/categories
├── validations/category.validation.js  // Joi request validation
├── middleware/auth.middleware.js       // JWT verify (stub, wire firebase later)
├── middleware/admin.middleware.js      // role check
├── middleware/upload.middleware.js     // multer (image -> buffer)
├── middleware/validate.middleware.js   // generic Joi validate wrapper
├── services/cloudinary.service.js      // image upload/delete helpers
├── utils/apiResponse.js
├── utils/apiError.js
└── utils/asyncHandler.js
```

> ⚠️ `auth.middleware.js` सध्या साधा JWT check करतो. जेव्हा तू Firebase OTP auth
> (`config/firebase.config.js` + `services/auth.service.js`) पूर्ण implement करशील,
> तेव्हा तिथे firebase-admin चा `verifyIdToken()` वापर.
>
> ⚠️ Controller मध्ये delete करताना `Product` model reference आहे (product ला category
> assigned आहे का check करण्यासाठी). जेव्हा तू `product.model.js` बनवशील, तेव्हा त्यात
> `category: { type: ObjectId, ref: "Category" }` field ठेव — नाहीतर हा check skip होईल.

---

## 🗂️ Category Schema

| Field           | Type       | Required | Default | Notes                                              |
|-----------------|------------|----------|---------|-----------------------------------------------------|
| `name`          | String     | ✅ Yes   | —       | Unique, 2–100 chars                                 |
| `slug`          | String     | Auto     | —       | Auto-generated from `name` (e.g. "Gold Ring" → `gold-ring`) |
| `description`   | String     | ❌ No    | `""`    | Max 1000 chars                                      |
| `image`         | String     | ❌ No*   | `""`    | Cloudinary URL, uploaded via `multipart/form-data` field `image` |
| `parentCategory`| ObjectId   | ❌ No    | `null`  | Ref to another Category — `null` = top-level category |
| `metalTypes`    | [String]   | ❌ No    | `[]`    | e.g. `["gold", "silver", "platinum"]`               |
| `attributes`    | [Object]   | ❌ No    | `[]`    | Dynamic filters — `{ name, options[] }`             |
| `displayOrder`  | Number     | ❌ No    | `0`     | Lower number shows first in menu/listing            |
| `isActive`      | Boolean    | ❌ No    | `true`  | Inactive categories hidden from storefront          |
| `createdBy`     | ObjectId   | Auto     | —       | Set from logged-in admin (`req.user.id`)            |
| `createdAt` / `updatedAt` | Date | Auto | —    | Mongoose timestamps                                 |

\* Image recommend केलं आहे पण schema level ला strictly required नाही — तू frontend form validation ने compulsory करू शकतोस.

---

## 📝 Admin ने Category Create करताना काय भरायचं?

Admin panel मध्ये "Add Category" form असा असावा:

1. **Category Name** *(required)* — उदा. "Gold Necklace"
2. **Description** *(optional)* — short SEO-friendly description
3. **Image** *(recommended)* — 1 image upload (jpeg/png/webp, max 5MB)
4. **Parent Category** *(optional dropdown)*
   - रिकामं सोडलं → हा एक **main/top-level category** बनतो (उदा. "Necklace")
   - एखादी category select केली → हा त्याचा **subcategory** बनतो (उदा. parent = "Necklace" → child = "Gold Necklace")
5. **Metal Types** *(optional multi-select)* — Gold, Silver, Platinum, Diamond, Rose Gold, इ.
6. **Attributes** *(dynamic filter builder)* — Admin ला हवे तितके custom filters add करता येतात:
   - Attribute Name: `Stone Type` → Options: `Pearl, Diamond, Ruby, None`
   - Attribute Name: `Purity` → Options: `18K, 22K, 24K`
   - हे frontend वर product-filter sidebar बनवायला वापरलं जातं
7. **Display Order** *(optional number)* — menu मध्ये sorting साठी, default `0`
8. **Active Status** *(toggle)* — default ON; OFF केलं तर category storefront वर दिसणार नाही

> **Slug**, **createdBy** आणि **image URL** हे auto-handle होतात — admin ला manually भरायची गरज नाही.

---

## 🔌 API Endpoints

Base path: `/api/categories`

| Method | Endpoint                        | Access       | Description                              |
|--------|----------------------------------|--------------|-------------------------------------------|
| GET    | `/`                              | Public       | List categories (filters + pagination)    |
| GET    | `/tree`                          | Public       | Nested parent→children tree (for navbar)  |
| GET    | `/slug/:slug`                    | Public       | Get one category by slug                  |
| GET    | `/:id`                           | Public       | Get one category by ID                    |
| GET    | `/:id/subcategories`             | Public       | Direct children of a category             |
| POST   | `/`                               | Admin only   | Create category                           |
| PUT    | `/:id`                           | Admin only   | Update category                           |
| PATCH  | `/:id/toggle-status`             | Admin only   | Quick enable/disable                      |
| DELETE | `/:id`                           | Admin only   | Delete (blocked if children/products exist) |

### `GET /` query params
`parentCategory` (id or `"null"` for top-level) · `metalType` · `isActive` (`true`/`false`) · `search` · `page` · `limit` · `sort`

---

## 📦 Example: Create Category (POST `/api/categories`)

Request — `multipart/form-data`:
```
name: Gold Necklace
description: Elegant handcrafted gold necklaces
parentCategory: 64f1c2a9e1b2c3a4d5e6f7a8
metalTypes: ["gold"]
attributes: [{"name":"Stone Type","options":["Pearl","Diamond","None"]}]
displayOrder: 1
isActive: true
image: <file>
```

Response `201`:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "64f...",
    "name": "Gold Necklace",
    "slug": "gold-necklace",
    "description": "Elegant handcrafted gold necklaces",
    "image": "https://res.cloudinary.com/.../categories/xyz.jpg",
    "parentCategory": "64f1c2a9e1b2c3a4d5e6f7a8",
    "metalTypes": ["gold"],
    "attributes": [
      { "name": "Stone Type", "options": ["Pearl", "Diamond", "None"] }
    ],
    "displayOrder": 1,
    "isActive": true,
    "createdBy": "64f...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## 🔒 Auth Notes

- Public GET routes = कोणीही access करू शकतं (storefront साठी).
- Create/Update/Delete/Toggle = फक्त logged-in admin (`protect` + `isAdmin` middleware).
- `req.user` हे JWT payload मधून येतं — तिथे `{ id, role: "admin" }` असणं गरजेचं आहे.

## 🧩 Dependencies to install
```bash
npm install express mongoose multer cloudinary joi jsonwebtoken
```

## ✅ TODO पुढे (तुझ्या structure प्रमाणे)
- [ ] `product.model.js` मध्ये `category` field ref add कर (delete-check साठी वापरलं जातं)
- [ ] `auth.service.js` + `firebase.config.js` पूर्ण करून `auth.middleware.js` अपडेट कर
- [ ] `error.middleware.js` बनव जो `ApiError` catch करून JSON response पाठवतो
- [ ] `app.js` मध्ये `require("./routes/index.routes")` ला `/api` prefix ने mount कर