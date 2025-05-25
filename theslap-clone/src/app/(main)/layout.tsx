// src/app/(main)/layout.tsx
import Navbar from '@/components/Navbar'; // Criaremos este componente a seguir

export default function MainApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="main-layout"> {/* Classe de globals.css */}
      <Navbar />
      <main className="content-area"> {/* Classe de globals.css */}
        {children}
      </main>
      {/* Você pode adicionar um Footer aqui se desejar */}
    </div>
  );
}