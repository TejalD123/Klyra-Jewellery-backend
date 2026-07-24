// When frontend sends multipart/form-data (because of file upload), array/object
// fields like sizeOptions, attributes, keepImages arrive as JSON strings.
// This middleware parses the given field names back into real arrays/objects.
//
// Usage: router.post("/", upload.array("images"), parseJsonFields(["sizeOptions"]), validate(schema), createProduct)
const parseJsonFields = (fields = []) => (req, res, next) => {
  fields.forEach((field) => {
    if (typeof req.body[field] === "string" && req.body[field].trim() !== "") {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (err) {
        // leave as-is; Joi validation will catch the type mismatch
      }
    }
  });
  next();
};

module.exports = parseJsonFields;