import { Landmark } from "lucide-react";
import PostListingManagement from "pages/settings/shared/PostListingManagement";

/** Secretary and Officials: the Secretary entry follows Employees; only its photo is edited here. */
const SecretaryOfficialsManagement = () => (
  <PostListingManagement
    endpoint="secretary-officials"
    heading="Secretary and Officials"
    subtitle="Manage Secretary and Officials listings shown across the system."
    itemLabel="Official Member"
    initials="SO"
    icon={Landmark}
    titlePresets={["Member", "Director", "Deputy Director"]}
    postTitle="Secretary"
  />
);

export default SecretaryOfficialsManagement;
