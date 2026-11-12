CREATE TABLE `atlas` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`events` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `atlas_slots` (
	`role` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`invite_hash` text,
	`expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `atlas_slots_user_id_unique` ON `atlas_slots` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `atlas_slots_invite_hash_unique` ON `atlas_slots` (`invite_hash`);