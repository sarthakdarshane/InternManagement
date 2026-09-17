require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./modules/auth/model");
const Company = require("./modules/company/model");
const SALT_ROUNDS = 10;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");

    // Fix admin role
    const admin = await User.findOne({ email: "admin@test.com" });
    if (admin && admin.role === "INTERN") {
      admin.role = "SUPERADMIN";
      await admin.save();
      console.log("Admin role updated to SUPERADMIN");
    }

    // Resolve or create the company for demo users
    let c = await Company.findOne({ name: "TechIntern Solutions" });
    if (!c) {
      c = new Company({ name: "TechIntern Solutions" });
      await c.save();
      console.log("Company 'TechIntern Solutions' created");
    }

    // Create or update Demo Admin (compatibility: previously "Demo HR", password: hr123456)
    const hrPassword = await bcrypt.hash("hr123456", SALT_ROUNDS);
    const hr = await User.findOne({ email: "hr@techintern.com" });
    if (!hr) {
      await User.create({
        name: "Demo HR",
        email: "hr@techintern.com",
        password: hrPassword,
        role: "ADMIN",
        company_id: c._id,
      });
      console.log("ADMIN created with password: hr123456");
    } else {
      hr.password = hrPassword;
      await hr.save();
      console.log("ADMIN password reset to: hr123456");
    }

    // Create or update Demo Mentor (password: mentor12345)
    const mentorPassword = await bcrypt.hash("mentor12345", SALT_ROUNDS);
    const m = await User.findOne({ email: "mentor@techintern.com" });
    if (!m) {
      await User.create({
        name: "Demo Mentor",
        email: "mentor@techintern.com",
        password: mentorPassword,
        role: "MENTOR",
        company_id: c._id,
      });
      console.log("Mentor created with password: mentor12345");
    } else {
      m.password = mentorPassword;
      m.role = "MENTOR";
      await m.save();
      console.log("Mentor password reset to: mentor12345");
    }

    await mongoose.connection.close();
    console.log("Done");
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();

