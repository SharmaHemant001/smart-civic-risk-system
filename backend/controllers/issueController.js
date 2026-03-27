export const uploadIssue = async (req, res) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  try {
    const { latitude, longitude, issueType } = req.body;

    const imageUrl = req.body.imageUrl || null;

    // ✅ FIXED IMAGE PATH
    const baseUrl = process.env.BASE_URL;

    const imagePath = req.file
      ? `${baseUrl}/${req.file.path.replace(/\\/g, "/")}`
      : null;

    if ((!imageUrl && !imagePath) || !latitude || !longitude || !issueType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne();

    if (user && user.reputationScore < -5) {
      return res.status(403).json({
        error: "Low reputation. Cannot report issues.",
      });
    }

    const existingIssue = await checkDuplicate(
      latitude,
      longitude,
      issueType
    );

    if (existingIssue) {
      existingIssue.votes += 1;
      existingIssue.riskScore = calculateRisk(
        issueType,
        existingIssue.votes
      );

      await existingIssue.save();

      return res.json({
        message: "Duplicate issue found, vote increased",
        issue: existingIssue,
      });
    }

    const riskScore = calculateRisk(issueType, 1);

    const newIssue = await Issue.create({
      imageUrl: imageUrl || imagePath,
      issueType,
      latitude,
      longitude,
      expiresAt,
      votes: 1,
      riskScore,
      status: "pending",
      reportedBy: user ? user._id : null,
    });

    res.status(201).json(newIssue);

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};