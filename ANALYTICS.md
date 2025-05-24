# Analytics Implementation Documentation

## Overview

This document outlines the comprehensive analytics implementation for the Text2LaTeX application using PostHog. The analytics system tracks user interactions, conversions, performance metrics, and user behavior across the entire application.

## Analytics Architecture

### Core Components

1. **`useAnalytics` Hook** (`app/hooks/useAnalytics.ts`)

   - Centralized analytics tracking
   - Automatic user identification when authenticated
   - Type-safe event tracking
   - Performance measurement utilities
   - Error tracking capabilities

2. **Enhanced PostHog Configuration** (`app/entry.client.tsx`)
   - Session recording with privacy controls
   - Automatic event capture
   - Performance monitoring
   - Browser capability tracking
   - Page load metrics

## Tracked Events

### Conversion Events

#### `conversion_started`

Triggered when a user initiates a LaTeX conversion.

```typescript
{
  input_length: number;
  input_type: "text" | "math" | "code";
}
```

#### `conversion_completed`

Triggered when a conversion is successfully completed.

```typescript
{
  input_length: number;
  output_length: number;
  duration_ms: number;
  success: boolean;
}
```

#### `conversion_failed`

Triggered when a conversion fails.

```typescript
{
  input_length: number;
  error_message: string;
  error_type: "length_limit" | "api_error" | "network_error" | "unknown";
}
```

### User Interaction Events

#### `text_input_changed`

Tracks text input modifications and paste events.

```typescript
{
  length: number;
  is_paste?: boolean;
}
```

#### `output_copied`

Tracks when users copy the generated LaTeX output.

```typescript
{
  output_length: number;
  copy_method: "button" | "keyboard";
}
```

#### `tab_switched`

Tracks tab switches between preview and code views.

```typescript
{
  from_tab: string;
  to_tab: string;
}
```

#### `theme_toggled`

Tracks theme preference changes.

```typescript
{
  from_theme: string;
  to_theme: string;
}
```

### Navigation Events

#### `page_viewed`

Enhanced page view tracking with additional context.

```typescript
{
  page: string;
  referrer?: string;
  url: string;
  search: string;
  hash: string;
}
```

#### `external_link_clicked`

Tracks clicks on external links.

```typescript
{
  url: string;
  link_text?: string;
  location: string;
}
```

### Authentication Events

#### `auth_sign_in_started`

Tracks when authentication is initiated.

```typescript
{
  method?: string;
}
```

#### `auth_sign_in_completed`

Tracks successful authentication.

```typescript
{
  method?: string;
  duration_ms?: number;
}
```

#### `auth_sign_out`

Tracks user sign-out events.

```typescript
{
}
```

### Feature Usage Events

#### `star_clicked`

Tracks when users star/unstar conversions.

```typescript
{
  conversion_id?: string;
  is_starred: boolean;
}
```

#### `history_opened`

Tracks when users open conversion history or favorites.

```typescript
{
  has_history: boolean;
  history_count?: number;
}
```

#### `history_item_selected`

Tracks selection of items from history or favorites.

```typescript
{
  item_index: number;
  input_length: number;
  output_length: number;
}
```

#### `feedback_submitted`

Tracks user feedback (likes/dislikes).

```typescript
{
  rating?: number;
  has_comment: boolean;
}
```

### Performance Events

#### `api_call_performance`

Automatically tracks API call performance.

```typescript
{
  endpoint: string;
  duration_ms: number;
  success: boolean;
  status_code?: number;
}
```

#### `page_load_performance`

Automatically tracks page load metrics.

```typescript
{
  load_time_ms: number;
  dom_ready_time_ms: number;
  dns_time_ms: number;
  tcp_time_ms: number;
  request_time_ms: number;
  response_time_ms: number;
  processing_time_ms: number;
}
```

### System Events

#### `error_occurred`

Tracks application errors with context.

```typescript
{
  error_type: string;
  error_message: string;
  component?: string;
  stack_trace?: string;
}
```

#### `viewport_size`

Tracks initial viewport dimensions.

```typescript
{
  width: number;
  height: number;
  device_pixel_ratio: number;
}
```

#### `browser_capabilities`

Tracks browser feature support.

```typescript
{
  has_local_storage: boolean;
  has_session_storage: boolean;
  has_indexeddb: boolean;
  has_websockets: boolean;
  has_webgl: boolean;
  connection_type: string;
  is_mobile: boolean;
}
```

## Common Properties

All events automatically include these common properties:

- `timestamp`: ISO timestamp
- `user_agent`: Browser user agent
- `screen_resolution`: Screen dimensions
- `timezone`: User timezone
- `language`: Browser language
- `is_authenticated`: Authentication status
- `user_id`: User identifier (when authenticated)

## User Identification

When users authenticate via Clerk, the system automatically identifies them in PostHog with:

- Email address
- First and last name
- Creation date
- Last sign-in date
- Profile image URL

## Usage Examples

### Basic Event Tracking

```typescript
const { track } = useAnalytics();

track("conversion_started", {
  input_length: text.length,
  input_type: "math",
});
```

### Performance Tracking

```typescript
const { withPerformanceTracking } = useAnalytics();

const result = await withPerformanceTracking(
  () => convertToLatex({ text }),
  "latex_conversion_api"
);
```

### Error Tracking

```typescript
const { trackError } = useAnalytics();

try {
  // Some operation
} catch (error) {
  trackError(error, "ComponentName", { additionalContext: "value" });
}
```

## Privacy and Compliance

- Session recordings mask all input fields by default
- Password fields are always masked
- Email fields are not masked (configurable)
- Respects Do Not Track (DNT) headers
- Users can opt out of tracking
- GDPR compliant with proper user identification

## PostHog Features Enabled

- **Session Recordings**: With input masking for privacy
- **Heatmaps**: For UI interaction analysis
- **Feature Flags**: Ready for A/B testing
- **Autocapture**: Automatic click and form tracking
- **Performance Monitoring**: Page load and API timing
- **Console Log Capture**: For debugging in production

## Development vs Production

- Development mode enables PostHog debug logging
- All events work in both environments
- API keys are environment-specific

## Monitoring and Alerts

The analytics implementation provides comprehensive data for:

- User behavior analysis
- Conversion funnel optimization
- Performance monitoring
- Error tracking and debugging
- Feature usage insights
- User journey mapping

## Next Steps

1. Set up PostHog dashboards for key metrics
2. Configure alerts for error rates and performance
3. Implement A/B testing with feature flags
4. Add cohort analysis for user retention
5. Set up automated reports for stakeholders
