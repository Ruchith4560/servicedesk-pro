export interface BusinessHoursConfig {
  startHour: number; // e.g. 9
  endHour: number;   // e.g. 17
}

export class SLACalculator {
  /**
   * Calculates a target deadline given a start date and required duration in hours.
   * If businessHoursOnly is true, non-working hours and weekends (Saturday/Sunday) are skipped.
   */
  static calculateDeadline(
    startDate: Date,
    hoursRequired: number,
    businessHoursOnly = false,
    config: BusinessHoursConfig = { startHour: 9, endHour: 17 }
  ): Date {
    if (!businessHoursOnly) {
      return new Date(startDate.getTime() + hoursRequired * 60 * 60 * 1000);
    }

    const { startHour, endHour } = config;
    let current = new Date(startDate);
    let remainingMinutes = Math.round(hoursRequired * 60);

    // Normalize start time to fall inside a valid business window
    current = this.advanceToNextBusinessWindow(current, startHour, endHour);

    while (remainingMinutes > 0) {
      // Calculate end of current business day
      const dayEnd = new Date(current);
      dayEnd.setUTCHours(endHour, 0, 0, 0);

      const availableMinutes = Math.max(0, Math.floor((dayEnd.getTime() - current.getTime()) / (60 * 1000)));

      if (remainingMinutes <= availableMinutes) {
        current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableMinutes;
        // Advance current to next business day startHour
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(startHour, 0, 0, 0);
        current = this.advanceToNextBusinessWindow(current, startHour, endHour);
      }
    }

    return current;
  }

  /**
   * Advances a date forward until it falls within Monday-Friday and between startHour and endHour (UTC).
   */
  private static advanceToNextBusinessWindow(date: Date, startHour: number, endHour: number): Date {
    const cur = new Date(date);

    while (true) {
      const day = cur.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const hour = cur.getUTCHours();

      // If Sunday (0), advance to Monday morning
      if (day === 0) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        cur.setUTCHours(startHour, 0, 0, 0);
        continue;
      }

      // If Saturday (6), advance 2 days to Monday morning
      if (day === 6) {
        cur.setUTCDate(cur.getUTCDate() + 2);
        cur.setUTCHours(startHour, 0, 0, 0);
        continue;
      }

      // If before business hours on a weekday, jump to startHour
      if (hour < startHour) {
        cur.setUTCHours(startHour, 0, 0, 0);
        break;
      }

      // If at or after end of business hours, jump to next day startHour
      if (hour >= endHour) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        cur.setUTCHours(startHour, 0, 0, 0);
        continue;
      }

      // Currently inside business hours on a weekday
      break;
    }

    return cur;
  }
}
