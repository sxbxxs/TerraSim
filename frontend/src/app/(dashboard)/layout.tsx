import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ProteccionRuta from "@/components/layout/ProteccionRuta";
import { EstudioProvider } from "@/lib/estudio-contexto";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProteccionRuta>
      <EstudioProvider>
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </EstudioProvider>
    </ProteccionRuta>
  );
}