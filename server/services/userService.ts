import UserModel from "../models/User";

export async function findAll() {
  return UserModel.find().lean();
}

export async function create(data: any) {
  const doc = new UserModel(data);
  return doc.save();
}
