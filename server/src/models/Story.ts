import mongoose, { Document, Schema } from 'mongoose';

// Sub-schemas for complex nested objects
const ConnectionSchema = new Schema({
  id: { type: String, required: true },
  targetNodeId: { type: String, required: true },
  label: { type: String, required: true },
}, { _id: false });

const PositionSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
}, { _id: false });

const StoryNodeSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  mediaUri: { type: String },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  position: { type: PositionSchema, required: true },
  connections: [ConnectionSchema],
  interactionCode: { type: String },
}, { _id: false });

const WorldSettingsSchema = new Schema({
  useInventory: { type: Boolean, default: false },
  useEconomy: { type: Boolean, default: false },
  useCombat: { type: Boolean, default: false },
}, { _id: false });

const StoryStyleSchema = new Schema({
  background: { type: String },
  textColor: { type: String },
  accentColor: { type: String },
  fontFamily: { type: String },
  titleFontFamily: { type: String },
  fontCategory: { type: String },
  animationClass: { type: String },
  layoutMode: { type: String },
  textureType: { type: String },
  textureColor: { type: String },
  textureOpacity: { type: Number },
  pageColor: { type: String },
  pageEdgeColor: { type: String },
  pageShadow: { type: Boolean },
  ornamentStyle: { type: String },
  titleFontSize: { type: String },
  textFontSize: { type: String },
  customCss: { type: String },
}, { _id: false });

const StoryVersionSchema = new Schema({
  id: { type: String, required: true },
  timestamp: { type: Date, required: true },
  nodes: [StoryNodeSchema],
  description: { type: String },
}, { _id: false });

export interface IStory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  prompt: string;
  nodes: any[];
  worldSettings: any;
  style?: any;
  versions: any[];
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Story name is required'],
      trim: true,
      maxlength: [100, 'Story name cannot exceed 100 characters'],
    },
    prompt: {
      type: String,
      default: '',
    },
    nodes: {
      type: [StoryNodeSchema],
      default: [],
    },
    worldSettings: {
      type: WorldSettingsSchema,
      default: () => ({
        useInventory: false,
        useEconomy: false,
        useCombat: false,
      }),
    },
    style: {
      type: StoryStyleSchema,
    },
    versions: {
      type: [StoryVersionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
storySchema.index({ userId: 1, updatedAt: -1 });

export const Story = mongoose.model<IStory>('Story', storySchema);
