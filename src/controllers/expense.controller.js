import Group from "../models/group.model.js";
import Expense from "../models/expense.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createExpense = asyncHandler(async (req, res) => {
  // ASSUMING THE GROUP IS ALREADY CREATED (will implement after)
  const { groupId, paidBy, totalAmount, participants, splitType } = req.body;

  if (!groupId || !paidBy || !totalAmount || !participants || !splitType) {
    throw new ApiError(400, "Missing required fields");
  }

  const group = await Group.findById(groupId);

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

  if (!uniqueParticipants.includes(paidBy)) {
    throw new ApiError(400, "Payer must be a participant");
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
    group: groupId,
    paidBy,
    totalAmount,
    participants: participantsWithShares,
    splitType,
  });

  return res.status(201).json(new ApiResponse(201, expense, "Expense created"));
});

export const getGroupExpenses = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  if (!groupId) {
    throw new ApiError(400, "Group ID is required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const expenses = await Expense.find({
    group: groupId,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .populate("paidBy", "name")
    .populate("participants.user", "name");

  return res
    .status(200)
    .json(new ApiResponse(200, expenses, "Group expenses retrieved"));
});

export const getGroupBalances = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  if (!groupId) {
    throw new ApiError(400, "Group ID is required");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const expenses = await Expense.find({
    group: groupId,
    isActive: true,
  })
    .populate("paidBy", "name")
    .populate("participants.user", "name");

  let balances = {};
  group.members.forEach((memberId) => {
    balances[memberId.toString()] = 0;
  });

  expenses.forEach((expense) => {
    balances[expense.paidBy._id.toString()] += expense.totalAmount;

    expense.participants.forEach((participant) => {
      balances[participant.user._id.toString()] -= participant.share;
    });
  });

  // Object.entries to iterate over the balances, as it doesn't has that option available already
  const formattedBalances = Object.entries(balances).map(
    ([userId, amount]) => ({
      userId,
      balance: Number(amount.toFixed(2)),
      status: amount > 0 ? "GETS_BACK" : amount < 0 ? "OWES" : "SETTLED",
    }),
  );

  return res
    .status(200)
    .json(new ApiResponse(200, formattedBalances, "Group balances retreived"));
});

export const getGroupSettlements = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  if (!groupId) {
    throw new ApiError(400, "Group ID is required");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const expenses = await Expense.find({
    group: groupId,
    isActive: true,
  });

  const balances = {};
  group.members.forEach((id) => {
    balances[id.toString()] = 0;
  });

  expenses.forEach((expense) => {
    balances[expense.paidBy.toString()] += expense.totalAmount;

    expense.participants.forEach((p) => {
      balances[p.user.toString()] -= p.share;
    });
  });

  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([userId, amount]) => {
    if (amount > 0) creditors.push({ userId, amount });
    if (amount < 0) debtors.push({ userId, amount });
  });

  return res.status(200).json(new ApiResponse(200, "Settlements generated"));
});
