export const getProductIdsByService = (serviceId) => {
  const serviceMap = {
    "solar-panel": [1, 2, 3],
    "solar-tank": [4, 5],
    "well-drilling": [6, 7],
  };
  return serviceMap[serviceId] || [];
};

export const getServiceTitle = (serviceId) => {
  const serviceTitles = {
    "solar-panel": "โซลาร์เซลล์",
    "solar-tank": "หอถังสูงโซลาร์เซลล์",
    "well-drilling": "เจาะบาดาลระบบแอร์",
  };
  return serviceTitles[serviceId] || "ไม่ระบุ";
};
