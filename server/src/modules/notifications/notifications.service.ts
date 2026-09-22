import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../../models/Notification.js';
import { AppError } from '../../middleware/error.middleware.js';

export class NotificationsService {
  /**
   * Dispatch an in-app notification to a user
   */
  static async createNotification(
    recipientId: string | mongoose.Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    linkUrl?: string
  ): Promise<INotification> {
    return Notification.create({
      recipientId: new mongoose.Types.ObjectId(recipientId),
      type,
      title,
      message,
      linkUrl,
      read: false,
      createdAt: new Date()
    });
  }

  /**
   * Get notifications for the authenticated user
   */
  static async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false
  ): Promise<{ notifications: INotification[]; unreadCount: number }> {
    const query: any = { recipientId: new mongoose.Types.ObjectId(userId) };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(userId),
        read: false
      })
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: new mongoose.Types.ObjectId(userId)
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    notification.read = true;
    await notification.save();
    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const res = await Notification.updateMany(
      { recipientId: new mongoose.Types.ObjectId(userId), read: false },
      { $set: { read: true } }
    );
    return { modifiedCount: res.modifiedCount };
  }
}
