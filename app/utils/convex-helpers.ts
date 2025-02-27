import { ConvexReactClient } from "convex/react";
import { APP_VERSION } from "./version";

/**
 * Clears the Convex client cache
 * Call this function when you encounter Convex-related errors
 *
 * @param client The ConvexReactClient instance
 */
export const clearConvexCache = (client: ConvexReactClient) => {
  try {
    // Force the client to clear its cache
    // @ts-ignore - accessing internal _cache property
    if (client._cache) {
      // @ts-ignore - clear method exists but is not in the public API
      client._cache.clear();
      console.log("Convex cache cleared successfully");
    }

    // Store the last cache clear time
    localStorage.setItem("convex_cache_cleared", Date.now().toString());
    localStorage.setItem("convex_cache_version", APP_VERSION);

    return true;
  } catch (error) {
    console.error("Error clearing Convex cache:", error);
    return false;
  }
};

/**
 * Checks if the Convex cache needs to be cleared based on version or time
 *
 * @param client The ConvexReactClient instance
 * @returns boolean indicating if cache was cleared
 */
export const checkAndClearConvexCache = (client: ConvexReactClient) => {
  try {
    const lastCacheVersion = localStorage.getItem("convex_cache_version");
    const lastCacheClear = localStorage.getItem("convex_cache_cleared");

    // Clear cache if version changed or it's been more than 1 hour
    const shouldClear =
      !lastCacheVersion ||
      lastCacheVersion !== APP_VERSION ||
      (lastCacheClear &&
        Date.now() - parseInt(lastCacheClear) > 60 * 60 * 1000);

    if (shouldClear) {
      return clearConvexCache(client);
    }

    return false;
  } catch (error) {
    console.error("Error checking Convex cache:", error);
    return false;
  }
};

/**
 * Wraps a Convex query with error handling that clears the cache on error
 *
 * @param queryFn The Convex query function to execute
 * @param client The ConvexReactClient instance
 * @param args Arguments to pass to the query function
 * @returns The result of the query function
 */
export const safeConvexQuery = async (
  queryFn: any,
  client: ConvexReactClient,
  ...args: any[]
) => {
  try {
    return await queryFn(...args);
  } catch (error) {
    console.error("Convex query error:", error);

    // If we get an error, clear the cache and try again
    clearConvexCache(client);

    // Retry the query once
    try {
      return await queryFn(...args);
    } catch (retryError) {
      console.error("Convex query retry failed:", retryError);
      throw retryError;
    }
  }
};
