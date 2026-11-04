-- ==============================================================================
-- ConvoCart / Handshake - Supabase Row Level Security (RLS) Policies
-- File: infra/supabase/rls_policies.sql
-- Description: Enables RLS on all 9 application tables and establishes
--              access boundaries for anon, authenticated, and service roles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on all application tables
-- ------------------------------------------------------------------------------
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listing_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transcript_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."webhook_nonces" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Sessions & Webhook Nonces: Complete Isolation (Server-Only)
-- Direct client access (anon or authenticated) must never read or write tokens/nonces.
-- ------------------------------------------------------------------------------
REVOKE ALL ON TABLE "public"."sessions" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."webhook_nonces" FROM anon, authenticated;

-- Explicit deny-all policies for defense-in-depth:
DROP POLICY IF EXISTS "Deny direct client access to sessions" ON "public"."sessions";
CREATE POLICY "Deny direct client access to sessions"
  ON "public"."sessions"
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Deny direct client access to webhook_nonces" ON "public"."webhook_nonces";
CREATE POLICY "Deny direct client access to webhook_nonces"
  ON "public"."webhook_nonces"
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ------------------------------------------------------------------------------
-- 3. Users Table Policies
-- Public can read basic profile info needed to render seller names on listings.
-- Users can only modify their own profile.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access to user profiles" ON "public"."users";
CREATE POLICY "Public read access to user profiles"
  ON "public"."users"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update only their own profile" ON "public"."users";
CREATE POLICY "Users can update only their own profile"
  ON "public"."users"
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 4. Listings Table Policies
-- Anyone can view public listings.
-- Authenticated sellers can insert and manage their own listings.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view listings" ON "public"."listings";
CREATE POLICY "Public can view listings"
  ON "public"."listings"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Sellers can insert their own listings" ON "public"."listings";
CREATE POLICY "Sellers can insert their own listings"
  ON "public"."listings"
  FOR INSERT
  TO authenticated
  WITH CHECK ("sellerId" = auth.uid()::text);

DROP POLICY IF EXISTS "Sellers can update their own listings" ON "public"."listings";
CREATE POLICY "Sellers can update their own listings"
  ON "public"."listings"
  FOR UPDATE
  TO authenticated
  USING ("sellerId" = auth.uid()::text)
  WITH CHECK ("sellerId" = auth.uid()::text);

DROP POLICY IF EXISTS "Sellers can delete their own listings" ON "public"."listings";
CREATE POLICY "Sellers can delete their own listings"
  ON "public"."listings"
  FOR DELETE
  TO authenticated
  USING ("sellerId" = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 5. Listing Translations Table Policies
-- Anyone can view translations of listings.
-- Translations are written by the backend translation engine.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view listing translations" ON "public"."listing_translations";
CREATE POLICY "Public can view listing translations"
  ON "public"."listing_translations"
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 6. Chats Table Policies
-- Only buyer or seller in the conversation can view and participate.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Chat participants can view their conversations" ON "public"."chats";
CREATE POLICY "Chat participants can view their conversations"
  ON "public"."chats"
  FOR SELECT
  TO authenticated
  USING ("buyerId" = auth.uid()::text OR "sellerId" = auth.uid()::text);

DROP POLICY IF EXISTS "Buyers can initiate chats" ON "public"."chats";
CREATE POLICY "Buyers can initiate chats"
  ON "public"."chats"
  FOR INSERT
  TO authenticated
  WITH CHECK ("buyerId" = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 7. Deals Table Policies
-- Only participants of the chat or public seal verifiers can access deals.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view their deals" ON "public"."deals";
CREATE POLICY "Participants can view their deals"
  ON "public"."deals"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."chats" c
      WHERE c."channelId" = deals."channelId"
        AND (c."buyerId" = auth.uid()::text OR c."sellerId" = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Public can view sealed deals by seal code" ON "public"."deals";
CREATE POLICY "Public can view sealed deals by seal code"
  ON "public"."deals"
  FOR SELECT
  TO anon, authenticated
  USING ("sealCode" IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 8. Cases Table Policies
-- Buyer, seller, or assigned support agent can view the case.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized parties can view their cases" ON "public"."cases";
CREATE POLICY "Authorized parties can view their cases"
  ON "public"."cases"
  FOR SELECT
  TO authenticated
  USING (
    "buyerId" = auth.uid()::text
    OR "sellerId" = auth.uid()::text
    OR "agentId" = auth.uid()::text
  );

-- ------------------------------------------------------------------------------
-- 9. Transcript Lines Table Policies
-- Only participants of the channel can view transcripts.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view transcript lines" ON "public"."transcript_lines";
CREATE POLICY "Participants can view transcript lines"
  ON "public"."transcript_lines"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."chats" c
      WHERE c."channelId" = transcript_lines."channelId"
        AND (c."buyerId" = auth.uid()::text OR c."sellerId" = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM "public"."cases" cs
      WHERE cs."channelId" = transcript_lines."channelId"
        AND (cs."buyerId" = auth.uid()::text OR cs."sellerId" = auth.uid()::text OR cs."agentId" = auth.uid()::text)
    )
  );
