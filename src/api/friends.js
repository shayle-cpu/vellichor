import { supabase } from "../supabaseClient";

export async function sendFriendRequest(friendId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: friendId,
    status: "pending",
  });
}

export async function acceptFriendship(rowId) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", rowId);
  return { error };
}

export async function declineFriendship(rowId) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "declined" })
    .eq("id", rowId);
  return { error };
}

export async function listIncomingRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };
  // rows where I'm the recipient
  return supabase
    .from("friendships")
    .select("id, status, user_id, friend_id, created_at, user:profiles!friendships_user_id_fkey(id, username, display_name)")
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
}

export async function listFriends() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  // accepted rows where I'm either side
  const { data, error } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq("status", "accepted");

  if (error || !data) return { data: [] };

  const ids = data.map(r => (r.user_id === user.id ? r.friend_id : r.user_id));
  if (ids.length === 0) return { data: [] };

  return supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);
}
