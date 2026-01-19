import Group from "../models/group.model.js";
import Expense from "../models/expense.model.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createExpense = asyncHandler(async (req, res) => {
  // ASSUMING THE GROUP IS ALREADY CREATED (will implement after)
  const { groupId, paidBy, totalAmount, participants, splitType } = req.body;

  if (!groupId || !paidBy || !totalAmount || !participants || !splitType) {
    throw new ApiError(400, "Missing required fields");
  }

  const group = await Group.findById({ group: groupId });

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  if (!group.members.includes(paidBy)) {
    throw new ApiError(400, "The person who paid is not a member of the group");
  }

  const uniqueParticipants = [...new Set(participants)];
  if (uniqueParticipants.length !== participants.length) {
    throw new ApiError(400, "Duplicate participants found");
  }

  for (let user of uniqueParticipants) {
    if (!group.members.includes(user)) {
      throw new ApiError(400, "Participant not in the group");
    }
  }

  if (totalAmount <= 0) {
    throw new ApiError(400, "Amount of this expense is invalid");
  }

  let participantsWithShares = [];
  if (splitType === "EQUAL") {
    const sharePerPerson = Number(
      (totalAmount / uniqueParticipants.length).toFixed(2),
    );
    participantsWithShares = uniqueParticipants.map((userId) => ({
      user: userId,
      share: sharePerPerson,
    }));
  }

  const expense = await Expense.create({
    groupId,
    paidBy,
    totalAmount,
    participants: participantsWithShares,
    splitType,
  });

  return res.status(201).json(ApiResponse(201, expense, "Expense created"));
});

export const getGroupBalances = asyncHandler(async (req, res) => {
  const { groupId, isActive, participants, paidBy, totalAmount } = req.body;
});
