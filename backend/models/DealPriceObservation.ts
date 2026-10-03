import mongoose from 'mongoose';

const dealPriceObservationSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramMessage',
    required: true,
    index: true,
  },
  sourceKey: {
    type: String,
    required: true,
    unique: true,
  },
  observedAt: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    default: null,
  },
  link: {
    type: String,
    default: null,
  },
  matchMethod: {
    type: String,
    required: true,
  },
  matchConfidence: {
    type: Number,
    default: null,
  },
});

dealPriceObservationSchema.index({ productId: 1, observedAt: 1 });

const DealPriceObservation = mongoose.model(
  'DealPriceObservation',
  dealPriceObservationSchema,
);

export default DealPriceObservation;
