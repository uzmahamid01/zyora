import { auth } from "../lib/firebase";
import { signOutChrome } from "../lib/chromeAuth";
import { toast } from "../components/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const UserInfo = () => {
  const user = auth.currentUser;

  const handleSignOut = () => {
    signOutChrome()
      .then(() =>
        toast({ title: "Signed out", description: "You have been signed out" })
      )
      .catch((e) =>
        toast({ title: "Sign out failed", description: String(e) })
      );
  };
  
  return (
    <div className="ml-auto flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover cursor-pointer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold cursor-pointer">
              {user?.displayName?.[0] || "U"}
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {/* <DropdownMenuItem onClick={handleProfile}>
            Profile
          </DropdownMenuItem> */}

          <DropdownMenuItem onClick={handleSignOut}>
            Sign Out
          </DropdownMenuItem>
          {/* {method && (
            <DropdownMenuItem disabled>
              Signed in with {method}
            </DropdownMenuItem>
          )} */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserInfo;
