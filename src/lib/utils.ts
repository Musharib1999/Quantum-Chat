import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively converts complex objects (like Mongoose documents, ObjectIds, and Buffers)
 * into plain JSON-serializable objects.
 */
export function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item)) as any;
  }

  // Handle Mongoose documents (they have a toObject or toJSON method)
  if (typeof (data as any).toObject === 'function') {
    return serializeData((data as any).toObject());
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString() as any;
  }

  // Handle MongoDB ObjectId (it has a hex string representation or toString)
  if ((data as any)._bsontype === 'ObjectID' || (data as any).constructor?.name === 'ObjectId') {
    return (data as any).toString() as any;
  }

  // Handle recursive Objects
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeData(data[key]);
      }
    }
    return result;
  }

  return data;
}
