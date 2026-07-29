const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  createQueryService,
  getAllQueriesService,
  getQueryByIdService,
  respondToQueryService,
  updateQueryStatusService,
  deleteQueryService,
} = require("../services/query.service");

const createQuery = asyncHandler(async (req, res) => {
  const query = await createQueryService(req.body, req.user?.id);
  return res.status(201).json(new ApiResponse(201, query, "Your query has been submitted. We'll get back to you soon."));
});

const getAllQueries = asyncHandler(async (req, res) => {
  const result = await getAllQueriesService(req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const getQueryById = asyncHandler(async (req, res) => {
  const query = await getQueryByIdService(req.params.id);
  return res.status(200).json(new ApiResponse(200, query));
});

const respondToQuery = asyncHandler(async (req, res) => {
  const query = await respondToQueryService(req.params.id, req.body.response, req.user.id);
  return res.status(200).json(new ApiResponse(200, query, "Response saved"));
});

const updateQueryStatus = asyncHandler(async (req, res) => {
  const query = await updateQueryStatusService(req.params.id, req.body.status);
  return res.status(200).json(new ApiResponse(200, query, "Status updated"));
});

const deleteQuery = asyncHandler(async (req, res) => {
  await deleteQueryService(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, "Query deleted"));
});

module.exports = {
  createQuery,
  getAllQueries,
  getQueryById,
  respondToQuery,
  updateQueryStatus,
  deleteQuery,
};