/*
  Warnings:

  - The primary key for the `links` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "access_logs" DROP CONSTRAINT "access_logs_link_id_fkey";

-- AlterTable
ALTER TABLE "access_logs" ALTER COLUMN "link_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "links" DROP CONSTRAINT "links_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "links_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "links_id_seq";

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
