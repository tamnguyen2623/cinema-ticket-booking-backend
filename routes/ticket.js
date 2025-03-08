const express = require("express");
const router = express.Router();
const ticketPriceController = require("../controllers/ticketController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/tickets",
  protect,
  authorize("admin"),
  ticketPriceController.createTicketPrice
);
router.get("/tickets", ticketPriceController.getAllTicketPrices);
router.get("/tickets/:id", ticketPriceController.getTicketPriceById);
router.put(
  "/tickets/:id",
  protect,
  authorize("admin"),
  ticketPriceController.updateTicketPrice
);
router.delete(
  "/tickets/:id",
  protect,
  authorize("admin"),
  ticketPriceController.deleteTicketPrice
);
router.patch(
  "/tickets/:id/toggle-delete",
  protect,
  authorize("admin"),
  ticketPriceController.toggleIsDelete
);

module.exports = router;
