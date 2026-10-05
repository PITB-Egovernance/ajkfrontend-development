import { Users } from "lucide-react";
import PostListingManagement from "pages/settings/shared/PostListingManagement";

/** Commission Members: the Chairman entry follows Employees and holds the Chairman's website message. */
const CommissionMembersManagement = () => (
  <PostListingManagement
    endpoint="commission-members"
    heading="Commission Members"
    subtitle="Manage AJK Public Service Commission Members and the Chairman's photo and message for the main website."
    itemLabel="Commission Member"
    initials="CM"
    icon={Users}
    titlePresets={["Member"]}
    postTitle="Chairman"
    withMessage
  />
);

export default CommissionMembersManagement;
