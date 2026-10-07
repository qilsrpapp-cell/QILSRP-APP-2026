/**
 * A conversation the current user belongs to - could be their cohort's
 * group chat, an ad-hoc group chat, or a 1:1 direct message. All three
 * share the same server-side table, distinguished only by `type`.
 */
export default class Conversation {
  constructor({ conversation_id, type, name, members = [] } = {}) {
    this.id = conversation_id;
    // One of 'cohort', 'group', or 'direct'.
    this.type = type;
    // The cohort/group name for 'cohort' and 'group' types. Not set for
    // 'direct' conversations - see displayName() below for what to show
    // instead.
    this.name = name;
    // Every member of the conversation, including the current user:
    // [{ name, email }, ...].
    this.members = members;
  }

  get isCohort() {
    return this.type === 'cohort';
  }

  get isGroup() {
    return this.type === 'group';
  }

  get isDirect() {
    return this.type === 'direct';
  }

  /**
   * What to show as this conversation's title. Cohort/group chats have a
   * real name; direct chats don't, so this shows the other person's name
   * instead (whoever isn't the current user).
   */
  displayName(currentUserEmail) {
    if (this.isDirect) {
      const other = this.members.find(member => member.email !== currentUserEmail);
      return other ? other.name : 'Direct Message';
    }
    return this.name || (this.isGroup ? 'Group Chat' : 'Cohort Chat');
  }
}
