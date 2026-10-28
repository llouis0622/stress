CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
