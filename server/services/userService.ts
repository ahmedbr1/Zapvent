import UserModel from "../models/User";

export async function findAll() {
  return UserModel.find().lean();
}

// TODO: Replace 'any' with a proper type/interface for user data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function create(data: any) {
  const doc = new UserModel(data);
  return doc.save();
}
