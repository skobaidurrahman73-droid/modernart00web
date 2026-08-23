// ==========================================================
// MODERN ART & PRESS - EASY EDIT CONFIGURATION
// এই ফাইলের তথ্যগুলো আপনি পরে নিজের মতো পরিবর্তন করবেন.
// Production Firebase secret/private key এখানে রাখবেন না.
// ==========================================================

const SHOP_CONFIG = {
  shopName: "Modern Art & Press",
  emergencyNumber: "01712371058",

  // Non-VIP account duration
  nonVipHours: 24,

  // Demo admin credentials ONLY - production-এ ব্যবহার করবেন না
  demoAdmin: {
    id: "admin",
    password: "123456"
  },

  designers: [
    {
      id: "designer1",
      name: "Rahim",
      phone: "01700000000",
      status: "available",
      speciality: "Banner & Poster"
    },
    {
      id: "designer2",
      name: "Karim",
      phone: "01800000000",
      status: "available",
      speciality: "Digital Print"
    },
    {
      id: "designer3",
      name: "Sakib",
      phone: "01900000000",
      status: "busy",
      speciality: "Logo & Creative Design"
    }
  ]
};
