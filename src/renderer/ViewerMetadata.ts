/** JSON encoding accepted for viewer annotations and provenance, not an admission policy. */
export type ViewerMetadataValue = string | number | boolean | null | ViewerMetadata | ViewerMetadataValue[];
export type ViewerMetadata = { [key: string]: ViewerMetadataValue };

/** Preserve the existing JSON round-trip when copying transform annotations.
 * This is not a validator or structured clone: native JSON normalization,
 * toJSON hooks and serialization failures are deliberately unchanged.
 */
export function copyViewerMetadata<T extends ViewerMetadata>(metadata: T): T {
  return JSON.parse(JSON.stringify(metadata)) as T;
}
