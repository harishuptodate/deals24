import mongoose from 'mongoose';

export type AppSettingData = {
  key: string;
  booleanValue: boolean;
};

const appSettingSchema = new mongoose.Schema<AppSettingData>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  booleanValue: {
    type: Boolean,
    required: true,
  },
}, { timestamps: true });

const AppSetting = (mongoose.models.AppSetting as mongoose.Model<AppSettingData> | undefined)
  || mongoose.model<AppSettingData>('AppSetting', appSettingSchema);

export default AppSetting;
