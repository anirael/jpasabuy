import { requireOwner } from "@/lib/auth";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  await requireOwner();
  return (
    <>
      <PageHeader title="Add customer" />
      <div className="max-w-xl">
        <CustomerForm action={createCustomer} />
      </div>
    </>
  );
}
