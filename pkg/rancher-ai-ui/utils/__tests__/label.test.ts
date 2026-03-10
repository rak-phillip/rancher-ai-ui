import { describe, it, expect } from '@jest/globals';
import { toLinkLabel } from '../label';

describe('toLinkLabel', () => {
  describe('Basic URL formatting', () => {
    it('should convert hyphen-separated words to title case', () => {
      expect(toLinkLabel('https://example.com/my-link-name')).toBe('My Link Name');
    });

    it('should convert underscore-separated words to title case', () => {
      expect(toLinkLabel('https://example.com/my_link_name')).toBe('My Link Name');
    });

    it('should handle single word URLs', () => {
      expect(toLinkLabel('https://example.com/documentation')).toBe('Documentation');
    });

    it('should handle mixed case URLs', () => {
      expect(toLinkLabel('https://example.com/MyLinkName')).toBe('My Link Name');
    });

    it('should handle URLs with numbers (startCase separates numbers with spaces)', () => {
      expect(toLinkLabel('https://example.com/api-v2-docs')).toBe('Api V 2 Docs');
    });

    it('should handle URLs with special characters converted to spaces', () => {
      expect(toLinkLabel('https://example.com/doc-123')).toBe('Doc 123');
    });
  });

  describe('Trailing slash handling', () => {
    it('should remove trailing slash before processing', () => {
      expect(toLinkLabel('https://example.com/my-link-name/')).toBe('My Link Name');
    });

    it('should handle URLs without trailing slash', () => {
      expect(toLinkLabel('https://example.com/my-link-name')).toBe('My Link Name');
    });

    it('should handle root URLs with trailing slash', () => {
      expect(toLinkLabel('https://example.com/')).toBe('Example Com');
    });
  });

  describe('Edge cases', () => {
    it('should return "Link" for empty URL', () => {
      expect(toLinkLabel('')).toBe('Link');
    });

    it('should extract domain when URL has no path', () => {
      expect(toLinkLabel('https://example.com')).toBe('Example Com');
    });

    it('should handle URLs with query parameters (startCase converts ? to space)', () => {
      expect(toLinkLabel('https://example.com/my-link-name?param=value')).toBe('My Link Name Param Value');
    });

    it('should handle URLs with fragments (startCase converts # to space)', () => {
      expect(toLinkLabel('https://example.com/my-link-name#section')).toBe('My Link Name Section');
    });

    it('should handle deeply nested URLs', () => {
      expect(toLinkLabel('https://example.com/path/to/my-link-name')).toBe('My Link Name');
    });

    it('should return "Link" when lastChunk is only hyphens (startCase returns empty string)', () => {
      expect(toLinkLabel('https://example.com/---')).toBe('Link');
    });

    it('should handle URLs with spaces', () => {
      expect(toLinkLabel('https://example.com/my link name')).toBe('My Link Name');
    });
  });

  describe('Real-world examples', () => {
    it('should format documentation URLs', () => {
      expect(toLinkLabel('https://docs.example.com/api-reference/')).toBe('Api Reference');
    });

    it('should format GitHub URLs', () => {
      expect(toLinkLabel('https://github.com/user/my-awesome-repo')).toBe('My Awesome Repo');
    });

    it('should format blog post URLs', () => {
      expect(toLinkLabel('https://blog.example.com/how-to-deploy-app')).toBe('How To Deploy App');
    });

    it('should format resource URLs with IDs', () => {
      expect(toLinkLabel('https://example.com/resources/resource-123')).toBe('Resource 123');
    });

    it('should format status page URLs', () => {
      expect(toLinkLabel('https://status.example.com/incidents/incident-456/')).toBe('Incident 456');
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null-like URLs gracefully', () => {
      expect(toLinkLabel('null')).toBe('Null');
    });

    it('should handle undefined-like URLs gracefully', () => {
      expect(toLinkLabel('undefined')).toBe('Undefined');
    });
  });
});
