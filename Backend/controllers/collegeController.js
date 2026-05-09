import College from "../models/College.js";

// Approve / Add College
export const approveCollege = async (req, res) => {
  try {
    const { name, wallet } = req.body;
    if (!name || !wallet) return res.status(400).json({ message: "Name & wallet required" });

    const existing = await College.findOne({ wallet });
    if (existing) {
      existing.status = "approved"; // if revoked, approve again
      existing.name = name;
      await existing.save();
      return res.json({ message: "College re-approved successfully", college: existing });
    }

    const college = await College.create({ name, wallet });
    res.json({ message: "College approved successfully", college });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approval failed" });
  }
};

// Get all colleges
export const getColleges = async (req, res) => {
  try {
    const colleges = await College.find();
    res.json(colleges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch colleges" });
  }
};

// Revoke college
export const revokeCollege = async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ message: "Wallet required" });

    const college = await College.findOne({ wallet });
    if (!college) return res.status(404).json({ message: "College not found" });

    college.status = "revoked";
    await college.save();
    res.json({ message: "College revoked successfully", college });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Revocation failed" });
  }
};
