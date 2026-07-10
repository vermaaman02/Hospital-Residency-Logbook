-- CreateTable
CREATE TABLE "ClearedNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearedNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClearedNotification_userId_idx" ON "ClearedNotification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClearedNotification_userId_itemId_key" ON "ClearedNotification"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "ClearedNotification" ADD CONSTRAINT "ClearedNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
