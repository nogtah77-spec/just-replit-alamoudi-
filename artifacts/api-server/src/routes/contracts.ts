import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { contractInstallmentsTable, contractsTable, contractDocumentSchema, contractInstallmentSchema, db, type Contract as ContractRow } from "@workspace/db";
import { requireStaff } from "../lib/auth";
import { actorFromReq, logActivity } from "../lib/activityLog";

const router: IRouter = Router();
const contractTypes = ["rent", "furnished_rent", "sale", "installment"] as const;
const statuses = ["draft", "active", "completed", "cancelled"] as const;
const fields = {
  contractNumber: z.string().optional(),
  contractType: z.enum(contractTypes).optional(),
  status: z.enum(statuses).optional(),
  propertyId: z.string().optional(),
  propertyCode: z.string().optional(),
  propertyTitle: z.string().optional(),
  propertyType: z.string().optional(),
  propertyRegion: z.string().optional(),
  propertyAddress: z.string().optional(),
  assignedStaffId: z.string().optional(),
  partyOneRole: z.string().optional(),
  partyOneName: z.string().optional(),
  partyOnePhone: z.string().optional(),
  partyOneEmail: z.string().optional(),
  partyOneNationalId: z.string().optional(),
  partyOneAddress: z.string().optional(),
  partyTwoRole: z.string().optional(),
  partyTwoName: z.string().optional(),
  partyTwoPhone: z.string().optional(),
  partyTwoEmail: z.string().optional(),
  partyTwoNationalId: z.string().optional(),
  partyTwoAddress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  signingDate: z.string().optional(),
  handoverDate: z.string().optional(),
  renewalDate: z.string().optional(),
  noticePeriod: z.string().optional(),
  totalAmount: z.string().optional(),
  paidAmount: z.string().optional(),
  remainingAmount: z.string().optional(),
  insuranceAmount: z.string().optional(),
  depositAmount: z.string().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentFrequency: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  installments: z.array(contractInstallmentSchema).optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  documents: z.array(contractDocumentSchema).optional(),
};
const createSchema = z.object(fields).refine((value) => Boolean(value.partyOneName?.trim() || value.partyTwoName?.trim()), {
  message: "يجب إدخال اسم طرف واحد على الأقل",
});
const updateSchema = z.object(fields);

type ContractResponse = ContractRow & { installments: Array<z.infer<typeof contractInstallmentSchema>> };

async function withInstallments(rows: ContractRow[]): Promise<ContractResponse[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => String(row.id));
  const installments = await db.select().from(contractInstallmentsTable).where(inArray(contractInstallmentsTable.contractId, ids));
  const byContract = new Map<string, typeof installments>();
  for (const installment of installments) {
    const current = byContract.get(installment.contractId) ?? [];
    current.push(installment);
    byContract.set(installment.contractId, current);
  }
  return rows.map((row) => ({
    ...row,
    installments: (byContract.get(String(row.id)) ?? []).map((installment) => ({
      id: installment.id,
      dueDate: installment.dueDate,
      amount: installment.amount,
      status: installment.status as z.infer<typeof contractInstallmentSchema>["status"],
      notes: installment.notes,
    })),
  }));
}

router.get("/contracts", requireStaff, async (_req, res): Promise<void> => {
  const rows = await db.select().from(contractsTable).orderBy(desc(contractsTable.updatedAt));
  res.json(await withInstallments(rows));
});

router.post("/contracts", requireStaff, async (req, res): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const now = new Date().toISOString();
  const { installments = [], ...contractData } = parsed.data;
  const row = await db.transaction(async (tx) => {
    const [created] = await tx.insert(contractsTable).values({
      id: randomUUID(),
      contractNumber: contractData.contractNumber?.trim() || `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      contractType: contractData.contractType ?? "sale",
      status: contractData.status ?? "draft",
      createdAt: now,
      updatedAt: now,
      ...contractData,
    }).returning();
    if (installments.length > 0) {
      await tx.insert(contractInstallmentsTable).values(installments.map((installment) => ({
        id: randomUUID(),
        contractId: created.id,
        dueDate: installment.dueDate,
        amount: installment.amount,
        status: installment.status,
        notes: installment.notes,
      })));
    }
    return created;
  });
  const [saved] = await withInstallments([row]);
  await logActivity({ action: "created", entityType: "contract", title: `تم إنشاء العقد ${saved.contractNumber}`, actor: actorFromReq(req) });
  res.status(201).json(saved);
});

router.patch("/contracts/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { installments, ...contractData } = parsed.data;
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx.update(contractsTable).set({ ...contractData, updatedAt: new Date().toISOString() }).where(eq(contractsTable.id, id)).returning();
    if (updated && installments !== undefined) {
      await tx.delete(contractInstallmentsTable).where(eq(contractInstallmentsTable.contractId, id));
      if (installments.length > 0) {
        await tx.insert(contractInstallmentsTable).values(installments.map((installment) => ({
          id: randomUUID(),
          contractId: id,
          dueDate: installment.dueDate,
          amount: installment.amount,
          status: installment.status,
          notes: installment.notes,
        })));
      }
    }
    return updated;
  });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const [saved] = await withInstallments([row]);
  await logActivity({ action: parsed.data.status ? "status" : "updated", entityType: "contract", title: `تم تحديث العقد ${saved.contractNumber}`, actor: actorFromReq(req) });
  res.json(saved);
});

router.delete("/contracts/:id", requireStaff, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [row] = await db.transaction(async (tx) => {
    await tx.delete(contractInstallmentsTable).where(eq(contractInstallmentsTable.contractId, id));
    return tx.delete(contractsTable).where(eq(contractsTable.id, id)).returning({ contractNumber: contractsTable.contractNumber });
  });
  if (row) await logActivity({ action: "deleted", entityType: "contract", title: `تم حذف العقد ${row.contractNumber}`, actor: actorFromReq(req) });
  res.sendStatus(204);
});

export default router;