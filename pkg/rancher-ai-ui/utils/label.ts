import { startCase } from 'lodash';

/**
 * Converts a URL to a label by extracting and formatting the last path segment
 *
 * @param url - The URL to format
 * @returns A formatted label extracted from the URL's last path segment
 *
 * @example
 *   https://example.com/my-link-name -> "My Link Name"
 *   https://example.com/api-reference/ -> "Api Reference"
 */
export function toLinkLabel(url: string): string {
  // Remove trailing slash if present
  const cleanUrl = url?.endsWith('/') ? url.slice(0, -1) : url;

  // Extract the last chunk of the URL path for label and normalize it
  const chunks = cleanUrl?.split('/') || [];
  const lastChunk = chunks[chunks.length - 1] || '';
  const label = startCase(lastChunk);

  return label || 'Link';
}
