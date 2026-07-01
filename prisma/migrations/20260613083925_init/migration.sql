-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "jerseyNum" INTEGER NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "tag" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Auction',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuctionLot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auctionId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lotNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "soldTo" TEXT,
    "finalPrice" INTEGER,
    CONSTRAINT "AuctionLot_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuctionLot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuctionTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auctionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "spent" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AuctionTeam_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuctionTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lotId" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AuctionLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuctionEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auctionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "teamId" TEXT,
    "simMin" INTEGER NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuctionEvent_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_short_key" ON "Team"("short");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionLot_auctionId_playerId_key" ON "AuctionLot"("auctionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionLot_auctionId_lotNumber_key" ON "AuctionLot"("auctionId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionTeam_auctionId_teamId_key" ON "AuctionTeam"("auctionId", "teamId");

-- CreateIndex
CREATE INDEX "Bid_lotId_idx" ON "Bid"("lotId");

-- CreateIndex
CREATE INDEX "Bid_teamId_idx" ON "Bid"("teamId");

-- CreateIndex
CREATE INDEX "AuctionEvent_auctionId_idx" ON "AuctionEvent"("auctionId");
