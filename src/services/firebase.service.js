const { auth } = require("../config/firebase.config");
const ApiError = require("../utils/apiError");

const verifyFirebaseIdToken = async (idToken) => {
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
  } catch (error) {
    throw new ApiError(401, "Invalid or expired Firebase token. Please verify your phone again.");
  }
};

module.exports = { verifyFirebaseIdToken };