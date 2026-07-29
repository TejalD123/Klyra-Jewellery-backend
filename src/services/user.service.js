const updateMeService = async (user, body) => {
  const { fullName } = body;

  if (fullName !== undefined) {
    user.fullName = fullName;
  }

  await user.save();
  return user;
};

module.exports = { updateMeService };