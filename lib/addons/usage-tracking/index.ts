import { Construct } from "constructs";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { supportsALL } from "../../utils";

/** 
 * Properties for UsageTracking
 */
export class UsageTrackingAddOnProps {
  /**
   * tags to add to stack description
  */
  readonly tags: string[];
}

@supportsALL
export class UsageTrackingAddOn implements ClusterAddOn {

  readonly props: UsageTrackingAddOnProps;

  constructor(props: UsageTrackingAddOnProps) {
    this.props = props;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {

    if (this.props.tags.length == 0) {
      return;
    }
    const stack = clusterInfo.cluster.stack;

    const tracking = new TaggedUsageTracking(stack.templateOptions.description || '');
    tracking.addTags(this.props.tags);

    
    stack.templateOptions.description = tracking.buildDescription();
  }

}

class TaggedUsageTracking {

  static TAGS_REGEX = /\(tag: ([^)]+)\)$/;

  description: string;

  tags: string[] = [];

  constructor(description: string) {
    this.description = description;
    const tagsMatch = this.description.match(TaggedUsageTracking.TAGS_REGEX);
    if (tagsMatch) {
      const existingTagsString = tagsMatch[1].trim();
      this.tags = existingTagsString.split(',').map(tag => tag.trim());
    }
  }

  addTags(tags: string | string[]) {
    const newTags = Array.isArray(tags) ? tags : [tags];
    this.tags = [...new Set([...this.tags, ...newTags])];
  }

  buildDescription(): string {
    if (this.tags.length === 0) {
      return this.description.replace(TaggedUsageTracking.TAGS_REGEX, '').trim();
    }
    const tagsString = this.tags.join(', ');

    const tagsMatch = this.description.match(TaggedUsageTracking.TAGS_REGEX);

    let newDescription: string;
    // if tags section exists, replace, otherwise add new section
    if (tagsMatch) {
      newDescription = this.description.replace(TaggedUsageTracking.TAGS_REGEX, `(tag: ${tagsString})`);
    } else {
      newDescription = `${this.description} (tag: ${tagsString})`.trim();
    }

    const byteLength = Buffer.byteLength(newDescription, 'utf16le');
    // if length too long, print error and return to old description
    if (byteLength > 1024) {
      console.error('Stack description is too long. Please remove some tags.');
      return this.description;
    } else {
      return newDescription;
    }
  }

  


}
