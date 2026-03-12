-- CreateTable
CREATE TABLE "itens_orcamentarios" (
    "id" TEXT NOT NULL,
    "produto" VARCHAR(255) NOT NULL,
    "item" VARCHAR(500) NOT NULL,
    "unidade" VARCHAR(50) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "cidade" VARCHAR(255) NOT NULL,
    "valor_minimo" DECIMAL(15,2) NOT NULL,
    "valor_medio" DECIMAL(15,2) NOT NULL,
    "valor_maximo" DECIMAL(15,2) NOT NULL,
    "caminho_referencia" TEXT,
    "data_extracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_orcamentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itens_orcamentarios_produto_idx" ON "itens_orcamentarios"("produto");

-- CreateIndex
CREATE INDEX "itens_orcamentarios_uf_idx" ON "itens_orcamentarios"("uf");

-- CreateIndex
CREATE INDEX "itens_orcamentarios_cidade_idx" ON "itens_orcamentarios"("cidade");

-- CreateIndex
CREATE UNIQUE INDEX "itens_orcamentarios_produto_item_uf_cidade_key" ON "itens_orcamentarios"("produto", "item", "uf", "cidade");
