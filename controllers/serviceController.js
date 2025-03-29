const Service = require("../models/Service");

const addService = async (req, res) => {
  try {
    const { cinemaName, fullName, phoneNumber, email, information } = req.body;

    const newService = new Service({ cinemaName, fullName, phoneNumber, email, information });
    await newService.save();

    res.status(201).json(newService); 
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

const listService = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

module.exports = {
  addService,
  listService, 
};
