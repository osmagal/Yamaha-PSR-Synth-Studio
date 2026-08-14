import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Copy, Check, Loader2, Coffee, Sparkles, Coins } from "lucide-react";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DonationModal({ isOpen, onClose, onSuccess }: DonationModalProps) {
  const [step, setStep] = useState<"form" | "loading" | "payment" | "success">("form");
  const [amount, setAmount] = useState<string>("10");
  const [email, setEmail] = useState<string>("");
  const [pixData, setPixData] = useState<{
    orderId: string;
    qr_code_base64: string;
    qr_code: string;
    amount: number;
    simulated?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for status once we are on the payment step
  useEffect(() => {
    if (step !== "payment" || !pixData) return;

    let intervalId: any;
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/donations/status/${pixData.orderId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "approved") {
            setStep("success");
            onSuccess();
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error("Error polling donation status:", err);
      }
    };

    // Poll every 4 seconds
    intervalId = setInterval(checkStatus, 4000);
    // Initial immediate check
    checkStatus();

    return () => clearInterval(intervalId);
  }, [step, pixData, onSuccess]);

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Por favor, insira um valor válido maior que zero.");
      return;
    }

    setError(null);
    setStep("loading");

    try {
      const response = await fetch("/api/donations/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, email })
      });

      if (response.ok) {
        const data = await response.json();
        setPixData(data);
        setStep("payment");
      } else {
        const errData = await response.json();
        setError(errData.error || "Falha ao gerar o Pix. Tente novamente.");
        setStep("form");
      }
    } catch (err) {
      console.error("Failed to generate Pix:", err);
      setError("Erro de rede ao conectar com o servidor.");
      setStep("form");
    }
  };

  const handleCopyCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForceApprove = async () => {
    if (!pixData) return;
    try {
      // Force status update in frontend by transitioning to success
      setStep("success");
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const resetModal = () => {
    setStep("form");
    setAmount("10");
    setEmail("");
    setPixData(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const presetValues = ["5", "10", "20", "50"];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-md bg-[#141416] border border-[#2A2A2E] rounded-2xl overflow-hidden shadow-2xl z-10 p-6 md:p-8 text-slate-300"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* STEP 1: Form */}
          {step === "form" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Heart size={20} className="fill-rose-500/10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Apoie o Synth Studio <Sparkles size={16} className="text-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Sua doação apoia atualizações e mantém o servidor ativo.</p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleGeneratePix} className="space-y-5">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selecione o valor do apoio (R$)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {presetValues.map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => {
                          setAmount(val);
                          setError(null);
                        }}
                        className={`py-2.5 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                          amount === val
                            ? "bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5"
                            : "bg-[#1E1E21] border-[#2A2A2E] hover:border-[#3A3A3F] text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {val === "5" ? <Coffee size={12} /> : val === "10" ? <Coins size={12} /> : <Heart size={12} />}
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError(null);
                      }}
                      className="w-full bg-[#1E1E21] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                      placeholder="Outro valor..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Seu E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1E1E21] border border-[#2A2A2E] rounded-lg px-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    placeholder="voce@exemplo.com"
                  />
                  <p className="text-[10px] text-slate-500">Utilizado para enviar a confirmação de recebimento.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <Heart size={14} className="fill-white" />
                  Gerar Pix Copia e Cola
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Loading */}
          {step === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Gerando Pix Seguro...</p>
                <p className="text-xs text-slate-400 mt-1">Conectando ao gateway do Mercado Pago</p>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Details */}
          {step === "payment" && pixData && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Escaneie ou Copie o Pix</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Apoio no valor de <strong className="text-white">R$ {pixData.amount.toFixed(2)}</strong>
                </p>
              </div>

              {/* QR Code Frame */}
              <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-inner relative group border-4 border-slate-800">
                <img
                  src={
                    pixData.qr_code 
                      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=141416&data=${encodeURIComponent(pixData.qr_code)}`
                      : pixData.qr_code_base64
                  }
                  alt="Pix QR Code"
                  className="w-full h-full object-contain select-none"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Failback to base64 if the QR code API ever fails
                    if (e.currentTarget.src !== pixData.qr_code_base64) {
                      e.currentTarget.src = pixData.qr_code_base64;
                    }
                  }}
                />
              </div>

              {/* Copy Paste Code */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pix Copia e Cola</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qr_code}
                    className="flex-1 bg-[#1E1E21] border border-[#2A2A2E] rounded-lg px-3 py-2.5 text-[10px] text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="px-4 bg-[#2A2A2E] hover:bg-[#35353A] border border-[#2A2A2E] text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    title="Copiar Código"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 bg-slate-500/5 py-2.5 px-4 rounded-xl border border-[#2A2A2E]">
                <Loader2 size={12} className="animate-spin text-rose-500" />
                <span>Aguardando pagamento... Identificação automática em segundos.</span>
              </div>

              {/* Simulation Helper (Highly useful for testing) */}
              {pixData.simulated && (
                <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Modo Demonstrativo Activo</p>
                    <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-mono">SIMULATOR</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    O status mudará para <span className="text-emerald-400 font-bold">Aprovado</span> automaticamente em 15 segundos, ou clique no botão abaixo para aprovação imediata.
                  </p>
                  <button
                    onClick={handleForceApprove}
                    className="w-full py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    Aprovar Pagamento Manualmente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Success */}
          {step === "success" && (
            <div className="py-6 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Check size={32} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Contribuição Recebida!</h3>
                <p className="text-xs text-slate-400 px-4">
                  Seu apoio generoso foi processado com sucesso. Muito obrigado por ajudar a manter o Synth Studio vivo e evoluindo! ❤️
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/10 uppercase tracking-widest text-xs"
              >
                Voltar ao Synth Studio
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
