const mongoose = require("mongoose");
const Query = require("../models/query.model");
const ApiError = require("../utils/apiError");
const { notifyAdmins } = require("./notification.service");

const createQueryService = async (body, userId) => {
  const { name, email, phone, subject, message } = body;

  const query = await Query.create({ name, email, phone, subject, message, user: userId || null });

  await notifyAdmins({
    type: "new_query",
    title: "New customer query",
    message: `${name} — ${subject || "General enquiry"}`,
    relatedModel: "Query",
    relatedId: query._id,
  });

  return query;
};

const getAllQueriesService = async ({ status, search, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [queries, total] = await Promise.all([
    Query.find(filter).populate("respondedBy", "username email").sort("-createdAt").skip(skip).limit(limitNum),
    Query.countDocuments(filter),
  ]);

  return {
    queries,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const getQueryByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest("Invalid query id");

  const query = await Query.findById(id).populate("respondedBy", "username email");
  if (!query) throw ApiError.notFound("Query not found");
  return query;
};

const respondToQueryService = async (id, response, adminId) => {
  const query = await Query.findById(id);
  if (!query) throw ApiError.notFound("Query not found");

  query.response = response;
  query.status = "resolved";
  query.respondedBy = adminId;
  query.respondedAt = new Date();
  await query.save();
  return query;
};

const updateQueryStatusService = async (id, status) => {
  const query = await Query.findByIdAndUpdate(id, { status }, { new: true });
  if (!query) throw ApiError.notFound("Query not found");
  return query;
};

const deleteQueryService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest("Invalid query id");

  const query = await Query.findByIdAndDelete(id);
  if (!query) throw ApiError.notFound("Query not found");
};

module.exports = {
  createQueryService,
  getAllQueriesService,
  getQueryByIdService,
  respondToQueryService,
  updateQueryStatusService,
  deleteQueryService,
};