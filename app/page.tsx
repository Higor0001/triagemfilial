"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export default function Home() {
  const initialized = useRef(false)
  const [showReport, setShowReport] = useState(false)
  const [reportDate, setReportDate] = useState("")
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({
    bicada: "",
    concorrencia1L: "",
    concorrencia600ml: "",
    concorrencia600mlVerde: "",
    concorrencia330ml: "",
    caixaConcorrencia: "",
    caminhao: "",
    turno: "Matutino",
    operador: "",
    frete: false,
    motorista: "",
    data: "",
  })
  const [connectionStatus, setConnectionStatus] = useState("online")
  const [pendingUploads, setPendingUploads] = useState(0)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualData, setManualData] = useState({
    caminhao: "",
    bicada: "0",
    concorrencia1L: "0",
    concorrencia600ml: "0",
    concorrencia600mlVerde: "0",
    concorrencia330ml: "0",
    caixaConcorrencia: "",
    turno: "Matutino",
    operador: "",
    frete: false,
    motorista: "",
    refugoAtrasado: false,
    dataRefugo: "",
  })
  const [showRefugoDialog, setShowRefugoDialog] = useState(false)
  const [currentProcessedPhotos, setCurrentProcessedPhotos] = useState([])
  const [updateInProgress, setUpdateInProgress] = useState(false)
  const [isSendingReport, setIsSendingReport] = useState(false) // Novo estado para o botao de envio de relatorio
  const [showCustomTruck, setShowCustomTruck] = useState(false) // Estado para mostrar campo de caminhao personalizado
  const [lastSentMessageId, setLastSentMessageId] = useState(null) // ID da ultima mensagem enviada ao Telegram
  const [lastSentTelegramInfo, setLastSentTelegramInfo] = useState({
    messageId: null,
    buttonId: null,
    bot: "",
    chatId: "",
  })
  const [showTermsPopup, setShowTermsPopup] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const operatorCatalog = [
    { name: "PEDRO LIMA FARIAS", matricula: "000382", turno: "Vespertino" },
    { name: "LUCAS PEREIRA DOS SANTOS", matricula: "000364", turno: "Vespertino" },
    { name: "IGOR SIMOES TELLES", matricula: "000376", turno: "Vespertino" },
    { name: "RENAN DEFANTE", matricula: "000205", turno: "Vespertino" },
    { name: "EDUARDO PINTO VIANA", matricula: "000335", turno: "Matutino" },
    { name: "ALEXANDRE HIGOR COSTA QUEIROZ", matricula: "000357", turno: "Matutino" },
    { name: "CARLOS HENRIQUE PROCOPIO PINTO", matricula: "000354", turno: "Matutino" },
  ]
  const driverList = [
    { matricula: "600", nome: "VINICIUS RAMOS MEUS" },
    { matricula: "601", nome: "RODRIGO ALVES" },
    { matricula: "602", nome: "JONATHAN DE JESUS" },
    { matricula: "603", nome: "LUCAS RODRIGUES DA SILVA" },
    { matricula: "604", nome: "EZIO MARIANO" },
    { matricula: "605", nome: "FRANCISCO CESAR ANTONIO" },
    { matricula: "606", nome: "JULIANO TEIXEIRA" },
    { matricula: "607", nome: "LUCAS GOMES" },
    { matricula: "608", nome: "CASSIO COSME ARGOLLO" },
    { matricula: "609", nome: "WILLIAM OLIVEIRA DE PAUL" },
    { matricula: "610", nome: "GIVANILDO SALLES" },
    { matricula: "611", nome: "ANTONIO MARCOS" },
    { matricula: "612", nome: "EUDES DAMASIO DOS SANTOS" },
    { matricula: "613", nome: "ALEXANDER CATANI BARONI" },
    { matricula: "614", nome: "PAULO CESAR DE OLIVEIRA" },
    { matricula: "615", nome: "LEANDRO PRADO" },
    { matricula: "616", nome: "ADELSON PAULUCIO" },
    { matricula: "617", nome: "NIVALDO" },
    { matricula: "618", nome: "HUMBERTO DE AZEVEDO" },
    { matricula: "619", nome: "GEILSON FRETE 2" },
    { matricula: "620", nome: "GEILSON FRETE 1" },
  ]

  const normalizeOperatorText = (value) => value.toUpperCase().replace(/\s+/g, " ").trim()
  const normalizeOperatorDigits = (value) => value.replace(/\D/g, "")
  const extractCodigo = (value) => {
    if (!value) return ""
    const trimmed = value.trim()
    const leading = trimmed.match(/^\d+/)
    if (leading) return leading[0]
    const groups = trimmed.match(/\d+/g)
    if (groups && groups.length > 0) return groups[groups.length - 1]
    return trimmed
  }

  const operatorLookup = (() => {
    const map = new Map()
    operatorCatalog.forEach((operator) => {
      const matriculaSemZeros = operator.matricula.replace(/^0+/, "") || "0"
      const label = `${operator.name} - ${operator.matricula}`
      const keys = [
        normalizeOperatorText(operator.name),
        normalizeOperatorText(`${operator.name} ${operator.matricula}`),
        normalizeOperatorText(`${operator.name} ${matriculaSemZeros}`),
        normalizeOperatorDigits(operator.matricula),
        normalizeOperatorDigits(matriculaSemZeros),
      ]
      keys.forEach((key) => {
        if (key) {
          map.set(key, { label, turno: operator.turno })
        }
      })
    })
    return map
  })()

  const operatorOptions = Array.from(
    new Set(operatorCatalog.map((operator) => `${operator.name} - ${operator.matricula}`)),
  )

  const getOperatorMatch = (value) => {
    const digitsKey = normalizeOperatorDigits(value)
    if (digitsKey && operatorLookup.has(digitsKey)) {
      return operatorLookup.get(digitsKey)
    }
    const textKey = normalizeOperatorText(value)
    if (textKey && operatorLookup.has(textKey)) {
      return operatorLookup.get(textKey)
    }
    return null
  }

  // Função de debounce para evitar atualizações excessivas
  const debounce = (func, delay) => {
    let timeoutId
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args)
      }, delay)
    }
  }

  const showStatus = (msg, type) => {
    const statusDisplay = document.getElementById("status")
    if (!statusDisplay) return
    statusDisplay.textContent = msg
    statusDisplay.className = "status"
    if (type) statusDisplay.classList.add(type)

    setTimeout(() => {
      statusDisplay.style.display = "none"
    }, 5000)
  }

  // Função para ajustar a data (movida para o escopo do componente)
  const dataAjustada = useCallback(() => {
    const hoje = new Date()
    const dia = hoje.getDay()
    // Se for segunda-feira (1), ajusta para SABADO (dia - 2)
    // Se for domingo (0), ajusta para sabado (dia - 1)
    // Caso contrario, ajusta para o dia anterior (dia - 1)
    if (dia === 1)
      hoje.setDate(hoje.getDate() - 2) // Segunda-feira -> Sabado
    else if (dia === 0)
      hoje.setDate(hoje.getDate() - 1) // Domingo -> Sabado
    else hoje.setDate(hoje.getDate() - 1) // Outros dias -> Dia anterior
    return `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(
      2,
      "0",
    )}/${hoje.getFullYear()}`
  }, [])

  const formatDateBr = (date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}/${date.getFullYear()}`
  }

  const formatTruckCode = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const prefix = cleaned.slice(0, 3)
    const suffix = cleaned.slice(3, 7)
    if (prefix && suffix) return `${prefix}-${suffix}`
    return prefix || suffix
  }

  const getRegistroData = (turno, refugoAtrasado, dataRefugo) => {
    if (turno === "Vespertino") {
      if (refugoAtrasado && dataRefugo) {
        return dataRefugo
      }
      return formatDateBr(new Date())
    }
    return dataAjustada()
  }

  const resetTelegramButton = (buttonId) => {
    if (!buttonId) return
    const button = document.getElementById(buttonId)
    if (button) {
      button.disabled = false
      button.textContent = "🚀 Enviar para Telegram"
      button.style.opacity = "1"
      button.style.cursor = "pointer"
      button.style.background = ""
      button.classList.remove("sending")
    }
  }

  const deleteLastTelegramMessage = async () => {
    const { messageId, bot, chatId } = lastSentTelegramInfo
    const resolvedBot = bot || document.getElementById("bot")?.value.trim()
    const resolvedChatId = chatId || document.getElementById("chatId")?.value.trim()

    if (!messageId || !resolvedBot || !resolvedChatId) return false

    try {
      const response = await fetch(`https://api.telegram.org/bot${resolvedBot}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: resolvedChatId,
          message_id: messageId,
        }),
      })
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.description || "Erro desconhecido")
      }
      return true
    } catch (error) {
      console.error("Telegram delete error:", error)
      showStatus("Erro ao apagar mensagem: " + error.message, "error")
      return false
    }
  }

  // Função para atualizar todas as descrições de imagens com os novos dados manuais
  const updateAllImageDescriptions = (newData) => {
    if (currentProcessedPhotos.length === 0) return

    setUpdateInProgress(true)

    const dados = JSON.parse(localStorage.getItem("bicadaData") || "[]")
    let atualizados = false

    // Atualizar cada item processado com os novos dados
    currentProcessedPhotos.forEach((timestamp) => {
      const index = dados.findIndex((item) => item.timestamp === timestamp)
      if (index !== -1) {
        // Atualizar dados no localStorage
        const resolvedTurno = newData.turno || dados[index].turno
        const resolvedData = getRegistroData(resolvedTurno, newData.refugoAtrasado, newData.dataRefugo)
        dados[index] = {
          ...dados[index],
          caminhao: newData.caminhao ? formatTruckCode(newData.caminhao) : dados[index].caminhao,
          bicada: newData.bicada || dados[index].bicada,
          concorrencia1L: newData.concorrencia1L || dados[index].concorrencia1L,
          concorrencia600ml: newData.concorrencia600ml || dados[index].concorrencia600ml,
          concorrencia600mlVerde: newData.concorrencia600mlVerde || dados[index].concorrencia600mlVerde,
          concorrencia330ml: newData.concorrencia330ml || dados[index].concorrencia330ml,
          caixaConcorrencia: newData.caixaConcorrencia || dados[index].caixaConcorrencia,
          turno: resolvedTurno,
          operador: newData.operador || dados[index].operador,
          frete: typeof newData.frete === "boolean" ? newData.frete : dados[index].frete,
          motorista: newData.motorista || dados[index].motorista,
          data: resolvedData,
        }

        // Atualizar a interface do usuário
        const itemElement = document.getElementById(`item-${timestamp}`)
        if (itemElement) {
          // Gerar nova descrição
          let novaDescricao = `🚛 CAMINHÃO: ${dados[index].caminhao}\n`

          if (dados[index].motorista)
            novaDescricao += `🚚 MOTORISTA: ${extractCodigo(dados[index].motorista) || dados[index].motorista}\n`
          if (dados[index].operador)
            novaDescricao += `👤 OPERADOR: ${extractCodigo(dados[index].operador) || dados[index].operador}\n`
          novaDescricao += `🕐 TURNO: ${dados[index].turno || "Não informado"}\n`
          if (dados[index].frete) novaDescricao += `🚚 FRETE: Sim\n`
          novaDescricao += `🍺 BICADA: ${dados[index].bicada}\n`

          if (dados[index].concorrencia1L !== "0")
            novaDescricao += `🏪 CONCORRÊNCIA 1L: ${dados[index].concorrencia1L}\n`
          if (dados[index].concorrencia600ml !== "0")
            novaDescricao += `🏪 CONCORRÊNCIA 600ml: ${dados[index].concorrencia600ml}\n`
          if (dados[index].concorrencia600mlVerde !== "0")
            novaDescricao += `🏪 CONCORRÊNCIA 600ml VERDE: ${dados[index].concorrencia600mlVerde}\n`
          if (dados[index].concorrencia330ml !== "0")
            novaDescricao += `🏪 CONCORRÊNCIA 330ml: ${dados[index].concorrencia330ml}\n`
          if (dados[index].caixaConcorrencia)
            novaDescricao += `📦 CAIXA CONCORRÊNCIA: ${dados[index].caixaConcorrencia}\n`

          novaDescricao += `📅 DATA: ${dados[index].data}`

          // Atualizar a descrição exibida
          const descricaoDiv = itemElement.querySelector('div[style*="background: rgba(26, 42, 108, 0.1)"]')
          if (descricaoDiv) {
            descricaoDiv.innerHTML = `<strong>Informações que serão enviadas:</strong><br>${novaDescricao.replace(/\n/g, "<br>")}`
          }

          // Atualizar o botão do Telegram com nova descrição
          const telegramBtn = itemElement.querySelector(".telegram-btn")
          if (telegramBtn) {
            const imgElement = document.getElementById(`img-${timestamp}`)
            const dataURL = imgElement ? imgElement.src : ""
            telegramBtn.onclick = new Function(
              `window.enviarParaTelegram('${dataURL}', '${telegramBtn.id}', \`${novaDescricao.replace(/`/g, "\\`")}\`)`,
            )
          }
        }

        atualizados = true
      }
    })

    if (atualizados) {
      localStorage.setItem("bicadaData", JSON.stringify(dados))
      showStatus("Todas as descrições foram atualizadas!", "success")
    }

    setUpdateInProgress(false)
  }

  // Versão com debounce da função de atualização
  const debouncedUpdateDescriptions = debounce(updateAllImageDescriptions, 300)

  // Função para gerar o texto do relatório
  const generateReportText = useCallback((dataFiltro) => {
    const dados = JSON.parse(localStorage.getItem("bicadaData") || "[]")
    const filteredData = dataFiltro ? dados.filter((item) => item.data === dataFiltro) : dados

    if (filteredData.length === 0) {
      return null // Retorna null se não houver dados
    }

    let relatorio = `RELATÓRIO DE BICADAS - ${dataFiltro || "TODOS OS DADOS"}\n`
    relatorio += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n`
    relatorio += `${"=".repeat(60)}\n\n`

    let totalBicada = 0
    let totalConcorrencia1L = 0
    let totalConcorrencia600ml = 0
    let totalConcorrencia600mlVerde = 0
    let totalConcorrencia330ml = 0
    const totalsByMotorista = {}

    filteredData.forEach((item, index) => {
      const motoristaCodigo = extractCodigo(item.motorista || "")
      const motoristaLabel = motoristaCodigo || item.motorista || "Não informado"
      relatorio += `${index + 1}. Data: ${item.data}\n`
      relatorio += `   Caminhão: ${item.caminhao}\n`
      relatorio += `   Turno: ${item.turno || "Não informado"}\n`
      relatorio += `   Operador: ${item.operador || "Não informado"}\n`
      relatorio += `   Motorista: ${motoristaLabel}\n`
      relatorio += `   Bicada: ${item.bicada}\n`
      relatorio += `   Concorrência 1L: ${item.concorrencia1L || "0"}\n`
      relatorio += `   Concorrência 600ml: ${item.concorrencia600ml || "0"}\n`
      relatorio += `   Concorrência 600ml VERDE: ${item.concorrencia600mlVerde || "0"}\n`
      relatorio += `   Concorrência 330ml: ${item.concorrencia330ml || "0"}\n`
      if (item.caixaConcorrencia) {
        relatorio += `   Caixa Concorrência: ${item.caixaConcorrencia}\n`
      }
      relatorio += `   ${"-".repeat(40)}\n`

      totalBicada += Number.parseInt(item.bicada) || 0
      totalConcorrencia1L += Number.parseInt(item.concorrencia1L) || 0
      totalConcorrencia600ml += Number.parseInt(item.concorrencia600ml) || 0
      totalConcorrencia600mlVerde += Number.parseInt(item.concorrencia600mlVerde) || 0
      totalConcorrencia330ml += Number.parseInt(item.concorrencia330ml) || 0

      if (motoristaLabel && motoristaLabel !== "Não informado") {
        totalsByMotorista[motoristaLabel] = (totalsByMotorista[motoristaLabel] || 0) + 1
      }
    })

    relatorio += `\nRESUMO:\n`
    relatorio += `Total de registros: ${filteredData.length}\n`
    relatorio += `🍺 Total Bicada: ${totalBicada}\n`
    relatorio += `🏪 Total Concorrência 1L: ${totalConcorrencia1L}\n`
    relatorio += `🏪 Total Concorrência 600ml: ${totalConcorrencia600ml}\n`
    relatorio += `🏪 Total Concorrência 600ml VERDE: ${totalConcorrencia600mlVerde}\n`
    relatorio += `🏪 Total Concorrência 330ml: ${totalConcorrencia330ml}\n`
    if (Object.keys(totalsByMotorista).length > 0) {
      relatorio += `\nTOTAL POR MOTORISTA:\n`
      Object.entries(totalsByMotorista)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
        .forEach(([motorista, total]) => {
          relatorio += `- ${motorista}: ${total}\n`
        })
    }
    relatorio += `${"=".repeat(60)}\n`

    return relatorio
  }, [])

  // Função para enviar o relatório para o Telegram como um arquivo .txt
  const sendReportToTelegram = useCallback(
    async (reportText, bot, chatId, buttonId, reportFileName = "relatorio.txt") => {
      const sendButton = document.getElementById(buttonId)
      if (sendButton) {
        sendButton.disabled = true
        sendButton.textContent = "⏳ Enviando..."
        sendButton.style.opacity = "0.7"
        sendButton.style.cursor = "not-allowed"
        sendButton.classList.add("sending")
      }
      setIsSendingReport(true)

      if (!bot || !chatId) {
        showStatus("Preencha bot e chat ID", "error")
        if (sendButton) {
          sendButton.disabled = false
          sendButton.textContent = "🚀 Enviar para Telegram"
          sendButton.style.opacity = "1"
          sendButton.style.cursor = "pointer"
          sendButton.classList.remove("sending")
        }
        setIsSendingReport(false)
        return false // Indica falha
      }

      // Check connection status before attempting upload
      if (connectionStatus === "offline") {
        showStatus("Sem conexão. Relatório salvo para envio posterior.", "processing")
        const pendingReports = JSON.parse(localStorage.getItem("pendingReports") || "[]")
        pendingReports.push({
          bot,
          chatId,
          text: reportText,
          timestamp: Date.now(),
          type: "manual_report",
          reportFileName,
        })
        localStorage.setItem("pendingReports", JSON.stringify(pendingReports))
        if (sendButton) {
          sendButton.disabled = false
          sendButton.textContent = "📤 Pendente"
          sendButton.style.opacity = "1"
          sendButton.style.background = "#ffc107"
          sendButton.style.cursor = "pointer"
          sendButton.classList.remove("sending")
        }
        setIsSendingReport(false)
        return false // Indica falha
      }

      if (connectionStatus === "unstable") {
        showStatus("Conexão instável. Tentando enviar relatório...", "processing")
      } else {
        showStatus("Enviando relatório para Telegram...", "processing")
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" })
        const formData = new FormData()
        formData.append("chat_id", chatId)
        formData.append("document", blob, reportFileName) // Envia como arquivo
        formData.append("caption", `📊 Relatório de Bicadas - ${reportFileName.replace(".txt", "")}`) // Legenda da mensagem

        const response = await fetch(`https://api.telegram.org/bot${bot}/sendDocument`, {
          // Usar sendDocument
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        await new Promise((resolve) => setTimeout(resolve, 1000))

        if (data.ok) {
          showStatus("Relatório enviado com sucesso!", "success")
          if (sendButton) {
            sendButton.disabled = true
            sendButton.textContent = "✅ Enviado"
            sendButton.style.opacity = "1"
            sendButton.style.background = "#28a745"
            sendButton.classList.remove("sending")
          }
          return true // Indica sucesso
        } else {
          throw new Error(data.description || "Erro desconhecido")
        }
      } catch (error) {
        console.error("Telegram send report error:", error)
        if (connectionStatus === "unstable" || error.message.includes("network") || error.message.includes("timeout")) {
          showStatus("Conexão instável. Relatório salvo para reenvio.", "processing")
          const pendingReports = JSON.parse(localStorage.getItem("pendingReports") || "[]")
          pendingReports.push({
            bot,
            chatId,
            text: reportText,
            timestamp: Date.now(),
            type: "manual_report",
            reportFileName,
          })
          localStorage.setItem("pendingReports", JSON.stringify(pendingReports))
          if (sendButton) {
            sendButton.disabled = false
            sendButton.textContent = "📤 Pendente"
            sendButton.style.opacity = "1"
            sendButton.style.background = "#ffc107"
            sendButton.style.cursor = "pointer"
            sendButton.classList.remove("sending")
          }
        } else {
          showStatus("Erro ao enviar relatório: " + error.message, "error")
          if (sendButton) {
            sendButton.disabled = false
            sendButton.textContent = "❌ Falha - Tentar novamente"
            sendButton.style.opacity = "1"
            sendButton.style.background = "#dc3545"
            sendButton.style.cursor = "pointer"
            sendButton.classList.remove("sending")
          }
        }
        return false // Indica falha
      } finally {
        setIsSendingReport(false)
      }
    },
    [connectionStatus],
  )

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Monitor connection status
    const updateConnectionStatus = () => {
      setConnectionStatus(navigator.onLine ? "online" : "offline")
    }

    window.addEventListener("online", updateConnectionStatus)
    window.addEventListener("offline", updateConnectionStatus)
    updateConnectionStatus()

    // Check pending uploads on load
    const checkPendingUploads = () => {
      const pending = JSON.parse(localStorage.getItem("pendingUploads") || "[]")
      setPendingUploads(pending.length)
    }
    checkPendingUploads()

    initializeApp()
    setupDailyReport()
    setupConnectionMonitoring()

    const termsAccepted = localStorage.getItem("termsAccepted")
    if (termsAccepted !== "true") {
      setShowTermsPopup(true)
    }

    // Setup connection monitoring and retry mechanism
    function setupConnectionMonitoring() {
      // Check connection quality periodically
      setInterval(checkConnectionQuality, 30000) // Every 30 seconds

      // Retry pending uploads when connection is restored
      window.addEventListener("online", () => {
        setTimeout(retryPendingUploads, 2000) // Wait 2 seconds after connection is restored
      })

      // Initial retry attempt
      if (navigator.onLine) {
        setTimeout(retryPendingUploads, 5000) // Wait 5 seconds after page load
      }
    }

    async function checkConnectionQuality() {
      if (!navigator.onLine) {
        setConnectionStatus("offline")
        return
      }

      try {
        const startTime = Date.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const response = await fetch("/favicon.ico", {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const endTime = Date.now()
        const responseTime = endTime - startTime

        if (response.ok) {
          if (responseTime < 1000) {
            setConnectionStatus("online")
          } else if (responseTime < 3000) {
            setConnectionStatus("slow")
          } else {
            setConnectionStatus("unstable")
          }
        } else {
          setConnectionStatus("unstable")
        }
      } catch (error) {
        setConnectionStatus("unstable")
      }
    }

    async function retryPendingUploads() {
      const pendingUploads = JSON.parse(localStorage.getItem("pendingUploads") || "[]")
      const pendingReports = JSON.parse(localStorage.getItem("pendingReports") || "[]")

      if (pendingUploads.length === 0 && pendingReports.length === 0) {
        setPendingUploads(0)
        return
      }

      console.log(
        `Tentando reenviar ${pendingUploads.length} uploads e ${pendingReports.length} relatórios pendentes...`,
      )

      // Retry image uploads
      for (let i = pendingUploads.length - 1; i >= 0; i--) {
        const upload = pendingUploads[i]

        try {
          const success = await attemptUpload(upload)

          if (success) {
            // Remove from pending list
            pendingUploads.splice(i, 1)
            localStorage.setItem("pendingUploads", JSON.stringify(pendingUploads))
            setPendingUploads(pendingUploads.length)

            // Update button status
            const button = document.getElementById(upload.buttonId)
            if (button) {
              button.disabled = true
              button.textContent = "✅ Enviado"
              button.style.background = "#28a745"
            }

            showStatus(`Upload pendente enviado com sucesso!`, "success")
          }
        } catch (error) {
          console.error("Erro ao reenviar upload:", error)
        }

        // Wait between attempts to avoid overwhelming the connection
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Retry pending reports
      for (let i = pendingReports.length - 1; i >= 0; i--) {
        const report = pendingReports[i]
        try {
          const botElement = document.getElementById("bot")
          const chatIdElement = document.getElementById("chatId")
          const bot = botElement?.value.trim()
          const chatId = chatIdElement?.value.trim()

          if (bot && chatId) {
            const success = await sendReportToTelegram(
              report.text,
              bot,
              chatId,
              `report-btn-${report.timestamp}`,
              report.reportFileName,
            )
            if (success) {
              pendingReports.splice(i, 1)
              localStorage.setItem("pendingReports", JSON.stringify(pendingReports))
              showStatus(`Relatório pendente enviado com sucesso!`, "success")
            }
          }
        } catch (error) {
          console.error("Erro ao reenviar relatório pendente:", error)
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    async function attemptUpload(uploadData) {
      try {
        const blob = await (await fetch(uploadData.dataURL)).blob()
        const formData = new FormData()
        formData.append("chat_id", uploadData.chatId)
        formData.append("caption", uploadData.caption || "Imagem marcada via MarcaFoto")
        formData.append("photo", blob, "imagem.jpg")

        const response = await fetch(`https://api.telegram.org/bot${uploadData.bot}/sendPhoto`, {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        return data.ok
      } catch (error) {
        console.error("Upload attempt failed:", error)
        return false
      }
    }

    function addToPendingUploads(uploadData) {
      const pendingUploads = JSON.parse(localStorage.getItem("pendingUploads") || "[]")
      pendingUploads.push({
        ...uploadData,
        timestamp: Date.now(),
        attempts: 0,
      })
      localStorage.setItem("pendingUploads", JSON.stringify(pendingUploads))
      setPendingUploads(pendingUploads.length)
    }

    // Setup daily report scheduler
    function setupDailyReport() {
      const checkTime = () => {
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()

        // Verifica se são 23:59
        if (hours === 23 && minutes === 59) {
          enviarRelatorioAutomatico()
        }
      }

      // Verifica a cada minuto
      setInterval(checkTime, 60000)
    }

    async function enviarRelatorioAutomatico() {
      try {
        const hoje = new Date()
        const dataFormatada = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`
        const reportFileName = `relatorio_diario_${dataFormatada.replace(/\//g, "-")}.txt`

        const relatorioTexto = generateReportText(dataFormatada)

        if (!relatorioTexto) {
          console.log("Nenhum dado para enviar no relatório automático")
          return
        }

        // Enviar para Telegram
        const botElement = document.getElementById("bot")
        const chatIdElement = document.getElementById("chatId")

        if (botElement && chatIdElement) {
          const bot = botElement.value.trim()
          const chatId = chatIdElement.value.trim()

          if (bot && chatId) {
            await sendReportToTelegram(relatorioTexto, bot, chatId, `auto-report-btn-${Date.now()}`, reportFileName) // Usar um ID único
          }
        }
      } catch (error) {
        console.error("Erro ao enviar relatório automático:", error)
      }
    }

    function initializeApp() {
      // Define all the functions in the global scope
      let stream = null
      let rearCameraDevices = []
      let currentCameraIndex = 0
      const cameraContainer = document.getElementById("camera-container")
      const cameraView = document.getElementById("camera-view")
      const switchCameraButton = document.getElementById("switch-camera")
      const upload = document.getElementById("upload")
      const fileNameDisplay = document.getElementById("file-name")
      const galeria = document.getElementById("galeria")
      const statusDisplay = document.getElementById("status")

      if (switchCameraButton) {
        switchCameraButton.disabled = true
        switchCameraButton.style.opacity = "0.6"
        switchCameraButton.style.cursor = "not-allowed"
      }

      // Attach event listener to file input
      if (upload) {
        upload.addEventListener("change", (e) => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) {
            if (fileNameDisplay) {
              fileNameDisplay.textContent = files.map((f) => f.name).join(", ")
            }
            files.forEach((file) => processarArquivo(file))
          }
        })
      }

      // Define all functions in the global scope
      const stopStream = () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
          stream = null
        }
      }

      const isRearCamera = (label = "") => /back|rear|traseira|environment/i.test(label)

      const loadRearCameraDevices = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        const rearCandidates = videoDevices.filter((device) => isRearCamera(device.label))
        rearCameraDevices = rearCandidates.length > 0 ? rearCandidates : videoDevices

        const currentDeviceId = stream?.getVideoTracks?.()[0]?.getSettings?.().deviceId
        const currentIndex = rearCameraDevices.findIndex((device) => device.deviceId === currentDeviceId)
        currentCameraIndex = currentIndex >= 0 ? currentIndex : 0

        if (switchCameraButton) {
          const hasMultiple = rearCameraDevices.length > 1
          switchCameraButton.disabled = !hasMultiple
          switchCameraButton.style.opacity = hasMultiple ? "1" : "0.6"
          switchCameraButton.style.cursor = hasMultiple ? "pointer" : "not-allowed"
        }
      }

      const startStreamWithDevice = async (deviceId) => {
        stopStream()
        const constraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: { facingMode: { ideal: "environment" } } }
        const s = await navigator.mediaDevices.getUserMedia(constraints)
        stream = s
        cameraView.srcObject = s
      }

      window.startCamera = async () => {
        if (!cameraContainer || !cameraView) return
        cameraContainer.style.display = "block"
        try {
          await startStreamWithDevice()
          await loadRearCameraDevices()
        } catch (error) {
          showStatus("Erro ao acessar a câmera", "error")
        }
      }

      window.stopCamera = () => {
        if (!cameraContainer) return
        stopStream()
        cameraContainer.style.display = "none"
      }

      window.switchRearCamera = async () => {
        if (!cameraView) return
        if (rearCameraDevices.length < 2) {
          showStatus("Apenas uma câmera traseira disponível", "processing")
          return
        }
        currentCameraIndex = (currentCameraIndex + 1) % rearCameraDevices.length
        try {
          await startStreamWithDevice(rearCameraDevices[currentCameraIndex].deviceId)
        } catch (error) {
          showStatus("Erro ao alternar a câmera", "error")
        }
      }

      window.capturePhoto = () => {
        if (!cameraView) return
        const canvas = document.createElement("canvas")
        canvas.width = cameraView.videoWidth
        canvas.height = cameraView.videoHeight
        const ctx = canvas.getContext("2d")
        ctx.drawImage(cameraView, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          const file = new File([blob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" })
          processarArquivo(file)
        }, "image/jpeg")
        window.stopCamera()
      }

      window.enviarParaTelegram = async (dataURL, buttonId, descricao = "") => {
        const botElement = document.getElementById("bot")
        const chatIdElement = document.getElementById("chatId")
        const sendButton = document.getElementById(buttonId)

        if (sendButton) {
          sendButton.disabled = true
          sendButton.textContent = "⏳ Enviando..."
          sendButton.style.opacity = "0.7"
          sendButton.style.cursor = "not-allowed"
          sendButton.classList.add("sending")
        }

        const bot = botElement?.value.trim()
        const chatId = chatIdElement?.value.trim()

        if (!bot || !chatId) {
          showStatus("Preencha bot e chat ID", "error")
          if (sendButton) {
            sendButton.disabled = false
            sendButton.textContent = "🚀 Enviar para Telegram"
            sendButton.style.opacity = "1"
            sendButton.style.cursor = "pointer"
            sendButton.classList.remove("sending")
          }
          return
        }

        // Check connection status before attempting upload
        if (connectionStatus === "offline") {
          showStatus("Sem conexão. Imagem salva para envio posterior.", "processing")
          addToPendingUploads({
            dataURL,
            bot,
            chatId,
            buttonId,
            caption: "Imagem marcada via MarcaFoto",
          })

          if (sendButton) {
            sendButton.disabled = false
            sendButton.textContent = "📤 Pendente"
            sendButton.style.opacity = "1"
            sendButton.style.background = "#ffc107"
            sendButton.style.cursor = "pointer"
            sendButton.classList.remove("sending")
          }
          return
        }

        if (connectionStatus === "unstable") {
          showStatus("Conexão instável. Tentando enviar...", "processing")
        } else {
          showStatus("Enviando para Telegram...", "processing")
        }

        try {
          await new Promise((resolve) => setTimeout(resolve, 500))

          const blob = await (await fetch(dataURL)).blob()
          const formData = new FormData()
          formData.append("chat_id", chatId)
          formData.append("caption", descricao || "Imagem enviada via MarcaFoto")
          formData.append("photo", blob, "imagem.jpg")

          const response = await fetch(`https://api.telegram.org/bot${bot}/sendPhoto`, {
            method: "POST",
            body: formData,
          })

          const data = await response.json()

          await new Promise((resolve) => setTimeout(resolve, 1000))

          if (data.ok) {
            showStatus("Enviado com sucesso!", "success")
            if (sendButton) {
              sendButton.disabled = true
              sendButton.textContent = "✅ Enviado"
              sendButton.style.opacity = "1"
              sendButton.style.background = "#28a745"
              sendButton.classList.remove("sending")
            }
            const messageId = data.result?.message_id ?? null
            setLastSentMessageId(messageId)
            setLastSentTelegramInfo({
              messageId,
              buttonId,
              bot,
              chatId,
            })

            // Mostrar diálogo de refugo após envio bem-sucedido
            setTimeout(() => {
              setShowRefugoDialog(true)
            }, 1500)
          } else {
            throw new Error(data.description || "Erro desconhecido")
          }
        } catch (error) {
          console.error("Telegram send error:", error)

          // Add to pending uploads if connection issues
          if (
            connectionStatus === "unstable" ||
            error.message.includes("network") ||
            error.message.includes("timeout")
          ) {
            showStatus("Conexão instável. Imagem salva para reenvio.", "processing")
            addToPendingUploads({
              dataURL,
              bot,
              chatId,
              buttonId,
              caption: "Imagem marcada via MarcaFoto",
            })

            if (sendButton) {
              sendButton.disabled = false
              sendButton.textContent = "📤 Pendente"
              sendButton.style.opacity = "1"
              sendButton.style.background = "#ffc107"
              sendButton.style.cursor = "pointer"
              sendButton.classList.remove("sending")
            }
          } else {
            showStatus("Erro ao enviar: " + error.message, "error")
            if (sendButton) {
              sendButton.disabled = false
              sendButton.textContent = "❌ Falha - Tentar novamente"
              sendButton.style.opacity = "1"
              sendButton.style.background = "#dc3545"
              sendButton.style.cursor = "pointer"
              sendButton.classList.remove("sending")
            }
          }
        }
      }

      // Function to retry all pending uploads manually
      window.retryAllPending = async () => {
        await retryPendingUploads()
      }

      // Function to save data to localStorage
      function salvarDados(dados) {
        try {
          const dadosExistentes = JSON.parse(localStorage.getItem("bicadaData") || "[]")
          dadosExistentes.push(dados)
          localStorage.setItem("bicadaData", JSON.stringify(dadosExistentes))
        } catch (error) {
          console.error("Erro ao salvar dados:", error)
        }
      }

      // Function to update data in localStorage
      window.atualizarDados = (timestamp, novosDados) => {
        try {
          const dados = JSON.parse(localStorage.getItem("bicadaData") || "[]")
          const index = dados.findIndex((item) => item.timestamp === timestamp)
          if (index !== -1) {
            dados[index] = { ...dados[index], ...novosDados }
            localStorage.setItem("bicadaData", JSON.stringify(dados))
            return true
          }
          return false
        } catch (error) {
          console.error("Erro ao atualizar dados:", error)
          return false
        }
      }

      // Function to get data from localStorage
      window.obterDados = (dataFiltro = null) => {
        try {
          const dados = JSON.parse(localStorage.getItem("bicadaData") || "[]")
          if (dataFiltro) {
            return dados.filter((item) => item.data === dataFiltro)
          }
          return dados
        } catch (error) {
          console.error("Erro ao obter dados:", error)
          return []
        }
      }

      // Function to generate report (for local download)
      window.gerarRelatorio = (dataFiltro) => {
        const relatorio = generateReportText(dataFiltro)

        if (!relatorio) {
          showStatus("Nenhum dado encontrado para a data selecionada", "error")
          return
        }

        const blob = new Blob([relatorio], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const fileName = `relatorio_bicadas_${dataFiltro ? dataFiltro.replace(/\//g, "-") : "completo"}_${new Date().toISOString().split("T")[0]}.txt`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        showStatus("Relatório gerado e baixado com sucesso!", "success")
      }

      function processarArquivo(file) {
        const reader = new FileReader()
        reader.onload = () => {
          const imagem = new Image()
          imagem.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            const maxWidth = 900
            const scale = maxWidth / imagem.width
            canvas.width = maxWidth
            canvas.height = imagem.height * scale
            ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height)

            // Processar diretamente com dados manuais
            finalizarProcessamento(canvas, ctx)
          }
          imagem.src = reader.result
        }
        reader.readAsDataURL(file)
      }

      function finalizarProcessamento(canvas, ctx) {
        const caminhao = manualData.caminhao ? formatTruckCode(manualData.caminhao) : "Não informado"
        const bicada = manualData.bicada || "0"
        const concorrencia1L = manualData.concorrencia1L || "0"
        const concorrencia600ml = manualData.concorrencia600ml || "0"
        const concorrencia600mlVerde = manualData.concorrencia600mlVerde || "0"
        const concorrencia330ml = manualData.concorrencia330ml || "0"
        const caixaConcorrencia = manualData.caixaConcorrencia || ""
        const turno = manualData.turno || "Não informado"
        const operador = manualData.operador || ""
        const frete = manualData.frete || false
        const motorista = manualData.motorista || ""
        const data = getRegistroData(turno, manualData.refugoAtrasado, manualData.dataRefugo)
        const timestamp = Date.now()

        // Save data to localStorage
        const dadosRegistro = {
          data,
          caminhao,
          bicada,
          concorrencia1L,
          concorrencia600ml,
          concorrencia600mlVerde,
          concorrencia330ml,
          caixaConcorrencia,
          turno,
          operador,
          frete,
          motorista,
          timestamp,
        }
        salvarDados(dadosRegistro)

        // Gerar descrição para a legenda do Telegram
        let descricao = `🚛 CAMINHÃO: ${caminhao}\n`

        if (motorista) descricao += `🚚 MOTORISTA: ${extractCodigo(motorista) || motorista}\n`
        if (operador) descricao += `👤 OPERADOR: ${extractCodigo(operador) || operador}\n`
        descricao += `🕐 TURNO: ${turno}\n`
        if (frete) descricao += `🚚 FRETE: Sim\n`
        descricao += `🍺 BICADA: ${bicada}\n`

        // Adicionar concorrência apenas se houver valores
        if (concorrencia1L !== "0") descricao += `🏪 CONCORRÊNCIA 1L: ${concorrencia1L}\n`
        if (concorrencia600ml !== "0") descricao += `🏪 CONCORRÊNCIA 600ml: ${concorrencia600ml}\n`
        if (concorrencia600mlVerde !== "0")
          descricao += `🏪 CONCORRÊNCIA 600ml VERDE: ${concorrencia600mlVerde}\n`
        if (concorrencia330ml !== "0") descricao += `🏪 CONCORRÊNCIA 330ml: ${concorrencia330ml}\n`
        if (caixaConcorrencia) descricao += `📦 CAIXA CONCORRÊNCIA: ${caixaConcorrencia}\n`

        descricao += `📅 DATA: ${data}`

        // Usar apenas a imagem original sem marca d'água
        const dataURL = canvas.toDataURL("image/jpeg", 0.9)

        // Adicionar à lista de fotos processadas
        setCurrentProcessedPhotos((prev) => [...prev, timestamp])

        if (galeria) {
          const buttonId = `telegram-btn-${timestamp}`
          const editButtonId = `edit-btn-${timestamp}`
          const div = document.createElement("div")
          div.className = "item"
          div.id = `item-${timestamp}`
          div.innerHTML = `
    <img src="${dataURL}" alt="Imagem processada" id="img-${timestamp}">
    <div style="font-size: 12px; background: rgba(26, 42, 108, 0.1); padding: 8px; border-radius: 5px; margin: 5px 0;">
      <strong>Informações que serão enviadas:</strong><br>
      ${descricao.replace(/\n/g, "<br>")}
    </div>
    <div style="display: flex; gap: 5px; margin-top: 10px;">
      <a href="${dataURL}" download="imagem_${timestamp}.jpg" style="flex: 1;">
        <button style="width: 100%; margin: 0;">⬇️ Baixar</button>
      </a>
      <button id="${editButtonId}" onclick="window.editarItem(${timestamp})" style="width: 40px; margin: 0; background: #ffc107;">✏️</button>
    </div>
    <button id="${buttonId}" class="telegram-btn" onclick="window.enviarParaTelegram('${dataURL}', '${buttonId}', \`${descricao.replace(/`/g, "\\`")}\`)">🚀 Enviar para Telegram</button>
  `
          // Inserir no início da galeria para mostrar as mais recentes primeiro
          galeria.insertBefore(div, galeria.firstChild)
        }
      }

      // Função para editar item
      window.editarItem = (timestamp) => {
        const dados = JSON.parse(localStorage.getItem("bicadaData") || "[]")
        const item = dados.find((d) => d.timestamp === timestamp)

        if (item) {
          setEditingItem(timestamp)
          setEditForm({
            bicada: item.bicada,
            concorrencia1L: item.concorrencia1L || "",
            concorrencia600ml: item.concorrencia600ml || "",
            concorrencia600mlVerde: item.concorrencia600mlVerde || "",
            concorrencia330ml: item.concorrencia330ml || "",
            caixaConcorrencia: item.caixaConcorrencia || "",
            caminhao: item.caminhao,
            turno: item.turno || "Matutino",
            operador: item.operador || "",
            frete: item.frete || false,
            motorista: item.motorista || "",
            data: item.data || "",
          })
        }
      }

      // Função para atualizar imagem editada
      window.atualizarImagemEditada = (timestamp, novosDados) => {
        // Atualizar dados no localStorage
        if (window.atualizarDados(timestamp, novosDados)) {
          // Encontrar o item na galeria
          const itemElement = document.getElementById(`item-${timestamp}`)

          if (itemElement) {
            // Gerar nova descrição
            let novaDescricao = `🚛 CAMINHÃO: ${novosDados.caminhao}\n`

            if (novosDados.motorista)
              novaDescricao += `🚚 MOTORISTA: ${extractCodigo(novosDados.motorista) || novosDados.motorista}\n`
            if (novosDados.operador)
              novaDescricao += `👤 OPERADOR: ${extractCodigo(novosDados.operador) || novosDados.operador}\n`
            novaDescricao += `🕐 TURNO: ${novosDados.turno || "Não informado"}\n`
            if (novosDados.frete) novaDescricao += `🚚 FRETE: Sim\n`
            novaDescricao += `🍺 BICADA: ${novosDados.bicada}\n`

            if (novosDados.concorrencia1L !== "0") novaDescricao += `🏪 CONCORRÊNCIA 1L: ${novosDados.concorrencia1L}\n`
            if (novosDados.concorrencia600ml !== "0")
              novaDescricao += `🏪 CONCORRÊNCIA 600ml: ${novosDados.concorrencia600ml}\n`
            if (novosDados.concorrencia600mlVerde !== "0")
              novaDescricao += `🏪 CONCORRÊNCIA 600ml VERDE: ${novosDados.concorrencia600mlVerde}\n`
            if (novosDados.concorrencia330ml !== "0")
              novaDescricao += `🏪 CONCORRÊNCIA 330ml: ${novosDados.concorrencia330ml}\n`
            if (novosDados.caixaConcorrencia)
              novaDescricao += `📦 CAIXA CONCORRÊNCIA: ${novosDados.caixaConcorrencia}\n`

            novaDescricao += `📅 DATA: ${novosDados.data}`

            // Atualizar a descrição exibida
            const descricaoDiv = itemElement.querySelector('div[style*="background: rgba(26, 42, 108, 0.1)"]')
            if (descricaoDiv) {
              descricaoDiv.innerHTML = `<strong>Informações que serão enviadas:</strong><br>${novaDescricao.replace(/\n/g, "<br>")}`
            }

            // Atualizar o botão do Telegram com nova descrição
            const telegramBtn = itemElement.querySelector(".telegram-btn")
            if (telegramBtn) {
              const imgElement = document.getElementById(`img-${timestamp}`)
              const dataURL = imgElement ? imgElement.src : ""
              telegramBtn.onclick = () => window.enviarParaTelegram(dataURL, telegramBtn.id, novaDescricao)
            }

            showStatus("Informações atualizadas com sucesso!", "success")
          }
        }
      }
    }

    return () => {
      window.removeEventListener("online", updateConnectionStatus)
      window.removeEventListener("offline", updateConnectionStatus)
    }
  }, [dataAjustada, generateReportText, sendReportToTelegram]) // Adiciona dependências para useCallback

  const handleAcceptTerms = () => {
    if (!termsChecked) return
    localStorage.setItem("termsAccepted", "true")
    setShowTermsPopup(false)
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return ""
    const [day, month, year] = dateString.split("/")
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const formatDateFromInput = (dateString) => {
    if (!dateString) return ""
    const [year, month, day] = dateString.split("-")
    return `${day}/${month}/${year}`
  }

  const handleEditSubmit = () => {
    if (editingItem && window.atualizarImagemEditada) {
      const dadosAtualizados = {
        ...editForm,
        caminhao: editForm.caminhao ? formatTruckCode(editForm.caminhao) : editForm.caminhao,
        timestamp: editingItem,
      }
      window.atualizarImagemEditada(editingItem, dadosAtualizados)
      setEditingItem(null)
      setEditForm({
        bicada: "",
        concorrencia1L: "",
        concorrencia600ml: "",
        concorrencia600mlVerde: "",
        concorrencia330ml: "",
        caixaConcorrencia: "",
        caminhao: "",
        turno: "Matutino",
        operador: "",
        frete: false,
        motorista: "",
        data: "",
      })
    }
  }

  const handleRefugoResponse = async (resposta) => {
    setShowRefugoDialog(false)

    if (resposta === "sim") {
      // Limpar todas as fotos da galeria
      const galeria = document.getElementById("galeria")
      if (galeria) {
        galeria.innerHTML = ""
      }

      // Resetar dados manuais
      setManualData({
        caminhao: "",
        bicada: "0",
        concorrencia1L: "0",
        concorrencia600ml: "0",
        concorrencia600mlVerde: "0",
        concorrencia330ml: "0",
        caixaConcorrencia: "",
        turno: "Matutino",
        operador: "",
        frete: false,
        motorista: "",
        refugoAtrasado: false,
        dataRefugo: "",
      })

      // Resetar estado do caminhao personalizado
      setShowCustomTruck(false)

      // Resetar lista de fotos processadas
      setCurrentProcessedPhotos([])
      setLastSentMessageId(null)
      setLastSentTelegramInfo({ messageId: null, buttonId: null, bot: "", chatId: "" })

      showStatus("Refugo realizado! Sistema limpo para novo caminhao.", "success")
    } else if (resposta === "nao") {
      // Usuario quer corrigir - abrir a secao de dados manuais
      setShowManualInput(true)
      const deleted = await deleteLastTelegramMessage()
      if (deleted) {
        showStatus("Mensagem apagada. Corrija os dados e reenvie.", "success")
        setLastSentMessageId(null)
        setLastSentTelegramInfo({ messageId: null, buttonId: null, bot: "", chatId: "" })
      } else {
        showStatus("Voce pode corrigir as informacoes e enviar novamente.", "processing")
      }
      resetTelegramButton(lastSentTelegramInfo.buttonId)
    } else if (resposta === "continuar") {
      // Usuario quer continuar adicionando fotos
      showStatus("Continue adicionando fotos ao mesmo caminhao.", "processing")
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "online":
        return "#28a745"
      case "slow":
        return "#ffc107"
      case "unstable":
        return "#fd7e14"
      case "offline":
        return "#dc3545"
      default:
        return "#6c757d"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "online":
        return "🟢 Online"
      case "slow":
        return "🟡 Lenta"
      case "unstable":
        return "🟠 Instável"
      case "offline":
        return "🔴 Offline"
      default:
        return "⚪ Verificando..."
    }
  }

  const handleSendReportToTelegramClick = async (fullReport = false) => {
    const botElement = document.getElementById("bot")
    const chatIdElement = document.getElementById("chatId")
    const bot = botElement?.value.trim()
    const chatId = chatIdElement?.value.trim()

    if (!bot || !chatId) {
      showStatus("Preencha o Token do Bot e o Chat ID do Telegram para enviar o relatório.", "error")
      return
    }

    const dataToFilter = fullReport ? null : reportDate
    const reportText = generateReportText(dataToFilter)

    if (!reportText) {
      showStatus("Nenhum dado para gerar o relatório.", "error")
      return
    }

    const reportFileName = `relatorio_bicadas_${dataToFilter ? dataToFilter.replace(/\//g, "-") : "completo"}_${new Date().toISOString().split("T")[0]}.txt`

    await sendReportToTelegram(reportText, bot, chatId, `manual-report-telegram-btn-${Date.now()}`, reportFileName)
  }

  return (
    <div className="marca-foto-container">
      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>
            <img
              src="/images/logo.webp"
              alt="Lippaus Logo"
              className="logo"
              style={{ height: "80px", width: "auto" }}
              crossOrigin="anonymous"
            />
          </h1>
          <a
            href="https://v0-lippausavarias.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "linear-gradient(135deg, #1a2a6c, #b21f1f)",
              color: "white",
              padding: "10px 15px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "bold",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            SISTEMA DE AVARIAS
          </a>
        </header>
        {/* Connection Status Bar */}
        <div
          style={{
            background: getConnectionStatusColor(),
            color: "white",
            padding: "8px 15px",
            borderRadius: "8px",
            marginBottom: "15px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
          }}
        >
          <span>
            <strong>Conexão:</strong> {getConnectionStatusText()}
          </span>
          {pendingUploads > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📤 {pendingUploads} pendente(s)</span>
              <button
                onClick={() => window.retryAllPending && window.retryAllPending()}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                🔄 Reenviar
              </button>
            </span>
          )}
        </div>

        {/* Manual Data Input Section */}
        <div style={{ marginTop: "20px", padding: "15px", background: "rgba(26, 42, 108, 0.1)", borderRadius: "10px" }}>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            style={{
              background: "#1a2a6c",
              color: "white",
              marginBottom: "10px",
              width: "100%",
            }}
          >
            {showManualInput ? "🔼 Ocultar Dados Manuais" : "🔽 Inserir Dados Manuais"}
          </button>

          {showManualInput && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label>Caminhao:</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={showCustomTruck ? "OUTRO" : manualData.caminhao}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "OUTRO") {
                      setShowCustomTruck(true)
                      const newData = { ...manualData, caminhao: "" }
                      setManualData(newData)
                    } else {
                      setShowCustomTruck(false)
                      const newData = { ...manualData, caminhao: value }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }
                  }}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", flex: 1 }}
                >
                  <option value="">Selecione um caminhao</option>
                  <option value="GTJ-8E12">GTJ-8E12</option>
                  <option value="RQS-0I92">RQS-0I92</option>
                  <option value="RQS-0E69">RQS-0E69</option>
                  <option value="KNM-3325">KNM-3325</option>
                  <option value="RQS-0J63">RQS-0J63</option>
                  <option value="MRH-8192">MRH-8192</option>
                  <option value="MRI-1083">MRI-1083</option>
                  <option value="MRH-8669">MRH-8669</option>
                  <option value="MQC-9961">MQC-9961</option>
                  <option value="MQO-9513">MQO-9513</option>
                  <option value="MQY-8756">MQY-8756</option>
                  <option value="MRH-8196">MRH-8196</option>
                  <option value="MRH-8069">MRH-8069</option>
                  <option value="MTA-3677">MTA-3677</option>
                  <option value="MQY-1470">MQY-1470</option>
                  <option value="RQR-3G49">RQR-3G49</option>
                  <option value="OMJ-2D48">OMJ-2D48</option>
                  <option value="SGF-4I14">SGF-4I14</option>
                  <option value="MPD-2I67">MPD-2I67</option>
                  <option value="MRX-6228">MRX-6228</option>
                  <option value="GYV-2062">GYV-2062</option>
                  <option value="MRU">MRU</option>
                  <option value="RQR-6I53">RQR-6I53</option>
                  <option value="ODH-9H60">ODH-9H60</option>
                  <option value="JKW-8558">JKW-8558</option>
                  <option value="RQE">RQE</option>
                  <option value="RQS-0J05">RQS-0J05</option>
                  <option value="RQS-0J57">RQS-0J57</option>
                  <option value="RQS-2B29">RQS-2B29</option>
                  <option value="RQS-2F30">RQS-2F30</option>
                  <option value="GKO-9775">GKO-9775</option>
                  <option value="MQU-3D13">MQU-3D13</option>
                  <option value="RQR-1D60">RQR-1D60</option>
                  <option value="RQR-4J42">RQR-4J42</option>
                  <option value="RQR-4J50">RQR-4J50</option>
                  <option value="RQR-4J57">RQR-4J57</option>
                  <option value="RQR-4J76">RQR-4J76</option>
                  <option value="RQR-4J64">RQR-4J64</option>
                  <option value="RQR-4J96">RQR-4J96</option>
                  <option value="RQR-4J93">RQR-4J93</option>
                  <option value="ODG-6793">ODG-6793</option>
                  <option value="KMP-0A82">KMP-0A82</option>
                  <option value="MSA-8D70">MSA-8D70</option>
                  <option value="PUX">PUX</option>
                  <option value="HNK-7G66">HNK-7G66</option>
                  <option value="KMS-6E52">KMS-6E52</option>
                  <option value="MQT-1H86">MQT-1H86</option>
                  <option value="MRC-3297">MRC-3297</option>
                  <option value="GKO-9I16">GKO-9I16</option>
                  <option value="MQT-3G22">MQT-3G22</option>
                  <option value="MQM-3J66">MQM-3J66</option>
                  <option value="MQD-0D69">MQD-0D69</option>
                  <option value="TON-5H63">TON-5H63</option>
                  <option value="RBF-7H12">RBF-7H12</option>
                  <option value="RQP-9C54">RQP-9C54</option>
                  <option value="OYJ-9J13">OYJ-9J13</option>
                  <option value="MPP-3308">MPP-3308</option>
                  <option value="KZF-7077">KZF-7077</option>
                  <option value="SFP-4I95">SFP-4I95</option>
                  <option value="SFP-4J08">SFP-4J08</option>
                  <option value="SFP-4J14">SFP-4J14</option>
                  <option value="MQG-4H30">MQG-4H30</option>
                  <option value="MPJ-8610">MPJ-8610</option>
                  <option value="GTF-3H49">GTF-3H49</option>
                  <option value="GLK-9124">GLK-9124</option>
                  <option value="KKK-5943">KKK-5943</option>
                  <option value="MPQ-3A25">MPQ-3A25</option>
                  <option value="MRU-0105">MRU-0105</option>
                  <option value="MPI-4050">MPI-4050</option>
                  <option value="MTJ-3372">MTJ-3372</option>
                  <option value="MQK-4E35">MQK-4E35</option>
                  <option value="MPU-6B41">MPU-6B41</option>
                  <option value="OVY-5256">OVY-5256</option>
                  <option value="MRU-4798">MRU-4798</option>
                  <option value="MQM-1B18">MQM-1B18</option>
                  <option value="MTG-4J70">MTG-4J70</option>
                  <option value="JCC-9B16">JCC-9B16</option>
                  <option value="JCC-9B42">JCC-9B42</option>
                  <option value="JCC-9B23">JCC-9B23</option>
                  <option value="QRD-6D86">QRD-6D86</option>
                  <option value="JCC-9B37">JCC-9B37</option>
                  <option value="JCC-9B11">JCC-9B11</option>
                  <option value="MSD-2029">MSD-2029</option>
                  <option value="SJE-2I44">SJE-2I44</option>
                  <option value="SJE-2I43">SJE-2I43</option>
                  <option value="SJE-2I46">SJE-2I46</option>
                  <option value="MTZ-4049">MTZ-4049</option>
                  <option value="BWD-7F04">BWD-7F04</option>
                  <option value="TOL-2C39">TOL-2C39</option>
                  <option value="SFV-1F54">SFV-1F54</option>
                  <option value="SFY-0C34">SFY-0C34</option>
                  <option value="QEL-2A08">QEL-2A08</option>
                  <option value="ODN-I753">ODN-I753</option>
                  <option value="MTT-4D36">MTT-4D36</option>
                  <option value="SJE-2I45">SJE-2I45</option>
                  <option value="MSU-0C58">MSU-0C58</option>
                  <option value="LVD-4G50">LVD-4G50</option>
                  <option value="MRB-5G29">MRB-5G29</option>
                  <option value="MSA-5970">MSA-5970</option>
                  <option value="MSY-5I35">MSY-5I35</option>
                  <option value="MTE-5A39">MTE-5A39</option>
                  <option value="MSI-6D14">MSI-6D14</option>
                  <option value="MRB-1A51">MRB-1A51</option>
                  <option value="REP-8E35">REP-8E35</option>
                  <option value="MQM-3I37">MQM-3I37</option>
                  <option value="SJE-2I48">SJE-2I48</option>
                  <option value="MSG-4H69">MSG-4H69</option>
                  <option value="REP-8E31">REP-8E31</option>
                  <option value="TOE-5H24">TOE-5H24</option>
                  <option value="PVL-2C54">PVL-2C54</option>
                  <option value="RQT-6I02">RQT-6I02</option>
                  <option value="OYG-1102">OYG-1102</option>
                  <option value="MQT-0B56">MQT-0B56</option>
                  <option value="UAX-1B82">UAX-1B82</option>
                  <option value="KNZ-7A70">KNZ-7A70</option>
                  <option value="SGL-8B39">SGL-8B39</option>
                  <option value="RQE-8A89">RQE-8A89</option>
                  <option value="RQQ-1D49">RQQ-1D49</option>
                  <option value="RBD-1H77">RBD-1H77</option>
                  <option value="LOQ-4A73">LOQ-4A73</option>
                  <option value="OCY-2J31">OCY-2J31</option>
                  <option value="RQQ-4A73">RQQ-4A73</option>
                  <option value="MQN-8C15">MQN-8C15</option>
                  <option value="ODM-6D45">ODM-6D45</option>
                  <option value="SFY-0234">SFY-0234</option>
                  <option value="MSF-5J25">MSF-5J25</option>
                  <option value="MTN-9142">MTN-9142</option>
                  <option value="HIJ-4228">HIJ-4228</option>
                  <option value="RQN-7J59">RQN-7J59</option>
                  <option value="EFW-9C42">EFW-9C42</option>
                  <option value="TXA-1A24">TXA-1A24</option>
                  <option value="MRQ-8C19">MRQ-8C19</option>
                  <option value="MRJ-3C99">MRJ-3C99</option>
                  <option value="QRE-0I89">QRE-0I89</option>
                  <option value="SGA-6C19">SGA-6C19</option>
                  <option value="MRI-2090">MRI-2090</option>
                  <option value="ODS-9254">ODS-9254</option>
                  <option value="MQC-1208">MQC-1208</option>
                  <option value="RHV-7H69">RHV-7H69</option>
                  <option value="MQR-0A12">MQR-0A12</option>
                  <option value="SFS-2J42">SFS-2J42</option>
                  <option value="MPO-2201">MPO-2201</option>
                  <option value="LAU-5E46">LAU-5E46</option>
                  <option value="MTN-6982">MTN-6982</option>
                  <option value="PPT-SN93">PPT-SN93</option>
                  <option value="0VI-2G96">0VI-2G96</option>
                  <option value="MPF-9D64">MPF-9D64</option>
                  <option value="DAJ-9J87">DAJ-9J87</option>
                  <option value="SGH-7C49">SGH-7C49</option>
                  <option value="QRD-0J81">QRD-0J81</option>
                  <option value="MQH-8401">MQH-8401</option>
                  <option value="TIT-3E27">TIT-3E27</option>
                  <option value="FSF-2J42">FSF-2J42</option>
                  <option value="MQU-4G41">MQU-4G41</option>
                  <option value="KRA-0J72">KRA-0J72</option>
                  <option value="SFT-3E90">SFT-3E90</option>
                  <option value="PPS-N93">PPS-N93</option>
                  <option value="OVI-2G96">OVI-2G96</option>
                  <option value="MSV-4709">MSV-4709</option>
                  <option value="ODO-5257">ODO-5257</option>
                  <option value="PPB-9I96">PPB-9I96</option>
                  <option value="OIV-2G96">OIV-2G96</option>
                  <option value="RQP-0G32">RQP-0G32</option>
                  <option value="SFY-2F54">SFY-2F54</option>
                  <option value="MPD-0A84">MPD-0A84</option>
                  <option value="MPW-1316">MPW-1316</option>
                  <option value="QRD-0981">QRD-0981</option>
                  <option value="QRD-6D83">QRD-6D83</option>
                  <option value="QRD-6D85">QRD-6D85</option>
                  <option value="QRD-6D87">QRD-6D87</option>
                  <option value="MQM-6040">MQM-6040</option>
                  <option value="MPZ-6125">MPZ-6125</option>
                  <option value="KUL-7G47">KUL-7G47</option>
                  <option value="MPZ-8494">MPZ-8494</option>
                  <option value="NZQ-2E94">NZQ-2E94</option>
                  <option value="OUTRO">Outro (digite abaixo)</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={manualData.frete}
                    onChange={(e) => {
                      const newData = { ...manualData, frete: e.target.checked }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                  />
                  Frete
                </label>
              </div>

              {showCustomTruck && (
                <input
                  type="text"
                  placeholder="Digite o codigo do caminhao (ex: ABC-1234)"
                  value={manualData.caminhao}
                  onChange={(e) => {
                    const newData = { ...manualData, caminhao: formatTruckCode(e.target.value) }
                    setManualData(newData)
                    debouncedUpdateDescriptions(newData)
                  }}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                />
              )}

              <label>Motorista:</label>
              <input
                type="text"
                list="motorista-options"
                placeholder="Digite nome ou código do motorista"
                value={manualData.motorista}
                onChange={(e) => {
                  const newData = { ...manualData, motorista: e.target.value }
                  setManualData(newData)
                  debouncedUpdateDescriptions(newData)
                }}
                disabled={manualData.frete}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={manualData.refugoAtrasado}
                    onChange={(e) => {
                      const newData = {
                        ...manualData,
                        refugoAtrasado: e.target.checked,
                        dataRefugo: e.target.checked ? manualData.dataRefugo : "",
                      }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                  />
                  Data divergente?
                </label>
                <input
                  type="date"
                  value={formatDateForInput(manualData.dataRefugo)}
                  onChange={(e) => {
                    const newData = { ...manualData, dataRefugo: formatDateFromInput(e.target.value) }
                    setManualData(newData)
                    debouncedUpdateDescriptions(newData)
                  }}
                  disabled={!manualData.refugoAtrasado}
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    opacity: manualData.refugoAtrasado ? "1" : "0.6",
                  }}
                />
              </div>

              <label>Operador:</label>
              <input
                type="text"
                list="operator-options"
                placeholder="Digite nome ou matrícula do operador"
                value={manualData.operador}
                onChange={(e) => {
                  const match = getOperatorMatch(e.target.value)
                  const newData = match
                    ? { ...manualData, operador: match.label, turno: match.turno }
                    : { ...manualData, operador: e.target.value }
                  setManualData(newData)
                  debouncedUpdateDescriptions(newData)
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              />

              <label>Turno:</label>
              <select
                value={manualData.turno}
                onChange={(e) => {
                  const newData = { ...manualData, turno: e.target.value }
                  setManualData(newData)
                  debouncedUpdateDescriptions(newData)
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
              </select>

              <label>Bicada:</label>
              <input
                type="number"
                value={manualData.bicada}
                onChange={(e) => {
                  const newData = { ...manualData, bicada: e.target.value }
                  setManualData(newData)
                  debouncedUpdateDescriptions(newData)
                }}
                min="0"
              />

              <label>Concorrência por Tipo:</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", marginBottom: "5px" }}>1L:</label>
                  <input
                    type="number"
                    value={manualData.concorrencia1L}
                    onChange={(e) => {
                      const newData = { ...manualData, concorrencia1L: e.target.value }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", marginBottom: "5px" }}>600ml:</label>
                  <input
                    type="number"
                    value={manualData.concorrencia600ml}
                    onChange={(e) => {
                      const newData = { ...manualData, concorrencia600ml: e.target.value }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", marginBottom: "5px" }}>600ml verde:</label>
                  <input
                    type="number"
                    value={manualData.concorrencia600mlVerde}
                    onChange={(e) => {
                      const newData = { ...manualData, concorrencia600mlVerde: e.target.value }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", marginBottom: "5px" }}>330ml:</label>
                  <input
                    type="number"
                    value={manualData.concorrencia330ml}
                    onChange={(e) => {
                      const newData = { ...manualData, concorrencia330ml: e.target.value }
                      setManualData(newData)
                      debouncedUpdateDescriptions(newData)
                    }}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Caixa de Concorrência:</label>
              <input
                type="text"
                value={manualData.caixaConcorrencia}
                onChange={(e) => {
                  const newData = { ...manualData, caixaConcorrencia: e.target.value }
                  setManualData(newData)
                  debouncedUpdateDescriptions(newData)
                }}
                placeholder="Ex: Caixa com 24 unidades de 330ml"
              />

              <button
                onClick={() => updateAllImageDescriptions(manualData)}
                style={{
                  background: "#17a2b8",
                  color: "white",
                  marginTop: "10px",
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
                disabled={updateInProgress || currentProcessedPhotos.length === 0}
              >
                {updateInProgress ? (
                  <>
                    <span style={{ visibility: updateInProgress ? "visible" : "hidden" }}>⏳</span> Atualizando...
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: "100%",
                        background: "rgba(255,255,255,0.2)",
                        transform: "translateX(-100%)",
                        animation: "loading 1.5s infinite linear",
                      }}
                    />
                  </>
                ) : (
                  <>🔄 Atualizar Todas as Descrições</>
                )}
              </button>

              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textAlign: "center",
                  marginTop: "5px",
                  fontStyle: "italic",
                }}
              >
                As alterações são aplicadas automaticamente às fotos
              </div>
            </div>
          )}
        </div>

        {/* Galeria de Evidências - Agora no topo */}
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ color: "#1a2a6c", marginBottom: "15px", textAlign: "center" }}>📸 Evidências Capturadas</h3>
          <div className="galeria" id="galeria"></div>
        </div>

        {/* Controles de Upload - Agora na parte inferior */}
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "rgba(26, 42, 108, 0.05)",
            borderRadius: "15px",
            border: "2px dashed #1a2a6c",
          }}
        >
          <h3 style={{ color: "#1a2a6c", marginBottom: "15px", textAlign: "center" }}>📤 Adicionar Evidências</h3>

          <label className="file-upload">
            <input type="file" id="upload" accept="image/*" hidden multiple />📁 Selecionar Imagens do Dispositivo
          </label>
          <div id="file-name" style={{ textAlign: "center", fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Nenhuma imagem selecionada
          </div>

          <div style={{ textAlign: "center", margin: "15px 0", color: "#666", fontSize: "14px" }}>
            <strong>OU</strong>
          </div>

          <button
            onClick={() => window.startCamera && window.startCamera()}
            style={{
              width: "100%",
              background: "linear-gradient(to right, #1a2a6c, #b21f1f)",
              color: "white",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            📷 Abrir Câmera
          </button>

          <div id="camera-container" style={{ display: "none", marginTop: "15px" }}>
            <video
              id="camera-view"
              autoPlay
              playsInline
              style={{ width: "100%", border: "2px solid #1a2a6c", borderRadius: "8px" }}
            ></video>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => window.capturePhoto && window.capturePhoto()}
                style={{ flex: 1, background: "#28a745" }}
              >
                📸 Capturar Foto
              </button>
              <button
                id="switch-camera"
                onClick={() => window.switchRearCamera && window.switchRearCamera()}
                style={{ flex: 1, background: "#17a2b8" }}
              >
                🔁 Trocar Câmera
              </button>
              <button
                onClick={() => window.stopCamera && window.stopCamera()}
                style={{ flex: 1, background: "#dc3545" }}
              >
                ❌ Fechar Câmera
              </button>
            </div>
          </div>
        </div>

        <label>Token do Bot Telegram:</label>
        <input type="text" id="bot" readOnly defaultValue="7971190858:AAEuWUmkcnsPGxwb7_IthIOXzuIyGZeosiM" />

        <label>Chat ID do Telegram:</label>
        <input type="text" id="chatId" readOnly defaultValue="-1002515711605" />

        {/* Report Section */}
        <div style={{ marginTop: "20px", padding: "15px", background: "rgba(26, 42, 108, 0.1)", borderRadius: "10px" }}>
          <h3 style={{ color: "#1a2a6c", marginBottom: "15px" }}>📊 Relatórios de Bicada</h3>

          <div
            style={{
              marginBottom: "10px",
              padding: "10px",
              background: "rgba(40, 167, 69, 0.1)",
              borderRadius: "5px",
              fontSize: "12px",
            }}
          >
            <strong>📅 Relatório Automático:</strong> Todos os dias às 23:59 um relatório será enviado automaticamente
            para o Telegram com os dados do dia.
          </div>

          <button
            onClick={() => setShowReport(!showReport)}
            style={{
              background: "#1a2a6c",
              color: "white",
              marginBottom: "10px",
              width: "100%",
            }}
          >
            {showReport ? "🔼 Ocultar Relatórios" : "🔽 Mostrar Relatórios"}
          </button>

          {showReport && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label>Selecionar Data (opcional):</label>
              <input
                type="date"
                value={formatDateForInput(reportDate)}
                onChange={(e) => setReportDate(formatDateFromInput(e.target.value))}
                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => window.gerarRelatorio && window.gerarRelatorio(reportDate)}
                  style={{
                    background: "#28a745",
                    color: "white",
                    flex: 1,
                  }}
                >
                  📄 Gerar Relatório
                </button>

                <button
                  onClick={() => window.gerarRelatorio && window.gerarRelatorio(null)}
                  style={{
                    background: "#17a2b8",
                    color: "white",
                    flex: 1,
                  }}
                >
                  📋 Relatório Completo
                </button>
              </div>

              <button
                onClick={() => handleSendReportToTelegramClick(false)}
                disabled={isSendingReport}
                id={`manual-report-telegram-btn-${Date.now()}`} // Unique ID for this button
                style={{
                  background: "#007bff",
                  color: "white",
                  marginTop: "10px",
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isSendingReport ? (
                  <>
                    <span style={{ visibility: isSendingReport ? "visible" : "hidden" }}>⏳</span> Enviando para
                    Telegram...
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: "100%",
                        background: "rgba(255,255,255,0.2)",
                        transform: "translateX(-100%)",
                        animation: "loading 1.5s infinite linear",
                      }}
                    />
                  </>
                ) : (
                  <>🚀 Enviar Relatório para Telegram</>
                )}
              </button>

              <button
                onClick={() => {
                  if (confirm("Tem certeza que deseja limpar todos os dados salvos?")) {
                    localStorage.removeItem("bicadaData")
                    localStorage.removeItem("pendingUploads")
                    localStorage.removeItem("pendingReports")
                    setPendingUploads(0)
                    alert("Dados limpos com sucesso!")
                  }
                }}
                style={{
                  background: "#dc3545",
                  color: "white",
                  fontSize: "12px",
                  padding: "5px",
                  marginTop: "10px",
                }}
              >
                🗑️ Limpar Todos os Dados
              </button>
            </div>
          )}
        </div>

        {/* Refugo Dialog */}
        {showRefugoDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                width: "90%",
                maxWidth: "450px",
                textAlign: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
            >
              <h3 style={{ marginBottom: "20px", color: "#1a2a6c", fontSize: "20px" }}>Refugo do Caminhao</h3>
              <p style={{ marginBottom: "25px", fontSize: "16px", lineHeight: "1.4" }}>
                O refugo do caminhao <strong>{manualData.caminhao}</strong> ja foi realizado?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  onClick={() => handleRefugoResponse("sim")}
                  style={{
                    background: "#28a745",
                    color: "white",
                    padding: "12px 25px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Sim, foi realizado
                </button>
                <button
                  onClick={() => handleRefugoResponse("nao")}
                  style={{
                    background: "#ffc107",
                    color: "#333",
                    padding: "12px 25px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Nao, preciso corrigir informacoes
                </button>
                <button
                  onClick={() => handleRefugoResponse("continuar")}
                  style={{
                    background: "#6c757d",
                    color: "white",
                    padding: "12px 25px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Continuar adicionando fotos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "10px",
                width: "90%",
                maxWidth: "400px",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <h3 style={{ marginBottom: "15px", color: "#1a2a6c" }}>✏️ Editar Informações</h3>

              <label>Caminhão:</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={editForm.caminhao}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "OUTRO") {
                      setEditForm({ ...editForm, caminhao: "" })
                    } else {
                      setEditForm({ ...editForm, caminhao: value })
                    }
                  }}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    width: "100%",
                    flex: 1,
                  }}
                >
                  <option value="">Selecione um caminhão</option>
                  <option value="GTJ-8E12">GTJ-8E12</option>
                  <option value="RQS-0I92">RQS-0I92</option>
                  <option value="RQS-0E69">RQS-0E69</option>
                  <option value="KNM-3325">KNM-3325</option>
                  <option value="RQS-0J63">RQS-0J63</option>
                  <option value="MRH-8192">MRH-8192</option>
                  <option value="MRI-1083">MRI-1083</option>
                  <option value="MRH-8669">MRH-8669</option>
                  <option value="MQC-9961">MQC-9961</option>
                  <option value="MQO-9513">MQO-9513</option>
                  <option value="MQY-8756">MQY-8756</option>
                  <option value="MRH-8196">MRH-8196</option>
                  <option value="MRH-8069">MRH-8069</option>
                  <option value="MTA-3677">MTA-3677</option>
                  <option value="MQY-1470">MQY-1470</option>
                  <option value="RQR-3G49">RQR-3G49</option>
                  <option value="OMJ-2D48">OMJ-2D48</option>
                  <option value="SGF-4I14">SGF-4I14</option>
                  <option value="MPD-2I67">MPD-2I67</option>
                  <option value="MRX-6228">MRX-6228</option>
                  <option value="GYV-2062">GYV-2062</option>
                  <option value="MRU">MRU</option>
                  <option value="RQR-6I53">RQR-6I53</option>
                  <option value="ODH-9H60">ODH-9H60</option>
                  <option value="JKW-8558">JKW-8558</option>
                  <option value="RQE">RQE</option>
                  <option value="RQS-0J05">RQS-0J05</option>
                  <option value="RQS-0J57">RQS-0J57</option>
                  <option value="RQS-2B29">RQS-2B29</option>
                  <option value="RQS-2F30">RQS-2F30</option>
                  <option value="GKO-9775">GKO-9775</option>
                  <option value="MQU-3D13">MQU-3D13</option>
                  <option value="RQR-1D60">RQR-1D60</option>
                  <option value="RQR-4J42">RQR-4J42</option>
                  <option value="RQR-4J50">RQR-4J50</option>
                  <option value="RQR-4J57">RQR-4J57</option>
                  <option value="RQR-4J76">RQR-4J76</option>
                  <option value="RQR-4J64">RQR-4J64</option>
                  <option value="RQR-4J96">RQR-4J96</option>
                  <option value="RQR-4J93">RQR-4J93</option>
                  <option value="ODG-6793">ODG-6793</option>
                  <option value="KMP-0A82">KMP-0A82</option>
                  <option value="MSA-8D70">MSA-8D70</option>
                  <option value="PUX">PUX</option>
                  <option value="HNK-7G66">HNK-7G66</option>
                  <option value="KMS-6E52">KMS-6E52</option>
                  <option value="MQT-1H86">MQT-1H86</option>
                  <option value="MRC-3297">MRC-3297</option>
                  <option value="GKO-9I16">GKO-9I16</option>
                  <option value="MQT-3G22">MQT-3G22</option>
                  <option value="MQM-3J66">MQM-3J66</option>
                  <option value="MQD-0D69">MQD-0D69</option>
                  <option value="TON-5H63">TON-5H63</option>
                  <option value="RBF-7H12">RBF-7H12</option>
                  <option value="RQP-9C54">RQP-9C54</option>
                  <option value="OYJ-9J13">OYJ-9J13</option>
                  <option value="MPP-3308">MPP-3308</option>
                  <option value="KZF-7077">KZF-7077</option>
                  <option value="SFP-4I95">SFP-4I95</option>
                  <option value="SFP-4J08">SFP-4J08</option>
                  <option value="SFP-4J14">SFP-4J14</option>
                  <option value="MQG-4H30">MQG-4H30</option>
                  <option value="MPJ-8610">MPJ-8610</option>
                  <option value="GTF-3H49">GTF-3H49</option>
                  <option value="GLK-9124">GLK-9124</option>
                  <option value="KKK-5943">KKK-5943</option>
                  <option value="MPQ-3A25">MPQ-3A25</option>
                  <option value="MRU-0105">MRU-0105</option>
                  <option value="MPI-4050">MPI-4050</option>
                  <option value="MTJ-3372">MTJ-3372</option>
                  <option value="MQK-4E35">MQK-4E35</option>
                  <option value="MPU-6B41">MPU-6B41</option>
                  <option value="OVY-5256">OVY-5256</option>
                  <option value="MRU-4798">MRU-4798</option>
                  <option value="MQM-1B18">MQM-1B18</option>
                  <option value="MTG-4J70">MTG-4J70</option>
                  <option value="JCC-9B16">JCC-9B16</option>
                  <option value="JCC-9B42">JCC-9B42</option>
                  <option value="JCC-9B23">JCC-9B23</option>
                  <option value="QRD-6D86">QRD-6D86</option>
                  <option value="JCC-9B37">JCC-9B37</option>
                  <option value="JCC-9B11">JCC-9B11</option>
                  <option value="MSD-2029">MSD-2029</option>
                  <option value="SJE-2I44">SJE-2I44</option>
                  <option value="SJE-2I43">SJE-2I43</option>
                  <option value="SJE-2I46">SJE-2I46</option>
                  <option value="MTZ-4049">MTZ-4049</option>
                  <option value="BWD-7F04">BWD-7F04</option>
                  <option value="TOL-2C39">TOL-2C39</option>
                  <option value="SFV-1F54">SFV-1F54</option>
                  <option value="SFY-0C34">SFY-0C34</option>
                  <option value="QEL-2A08">QEL-2A08</option>
                  <option value="ODN-I753">ODN-I753</option>
                  <option value="MTT-4D36">MTT-4D36</option>
                  <option value="SJE-2I45">SJE-2I45</option>
                  <option value="MSU-0C58">MSU-0C58</option>
                  <option value="LVD-4G50">LVD-4G50</option>
                  <option value="MRB-5G29">MRB-5G29</option>
                  <option value="MSA-5970">MSA-5970</option>
                  <option value="MSY-5I35">MSY-5I35</option>
                  <option value="MTE-5A39">MTE-5A39</option>
                  <option value="MSI-6D14">MSI-6D14</option>
                  <option value="MRB-1A51">MRB-1A51</option>
                  <option value="REP-8E35">REP-8E35</option>
                  <option value="MQM-3I37">MQM-3I37</option>
                  <option value="SJE-2I48">SJE-2I48</option>
                  <option value="MSG-4H69">MSG-4H69</option>
                  <option value="REP-8E31">REP-8E31</option>
                  <option value="TOE-5H24">TOE-5H24</option>
                  <option value="PVL-2C54">PVL-2C54</option>
                  <option value="RQT-6I02">RQT-6I02</option>
                  <option value="OYG-1102">OYG-1102</option>
                  <option value="MQT-0B56">MQT-0B56</option>
                  <option value="UAX-1B82">UAX-1B82</option>
                  <option value="KNZ-7A70">KNZ-7A70</option>
                  <option value="SGL-8B39">SGL-8B39</option>
                  <option value="RQE-8A89">RQE-8A89</option>
                  <option value="RQQ-1D49">RQQ-1D49</option>
                  <option value="RBD-1H77">RBD-1H77</option>
                  <option value="LOQ-4A73">LOQ-4A73</option>
                  <option value="OCY-2J31">OCY-2J31</option>
                  <option value="RQQ-4A73">RQQ-4A73</option>
                  <option value="MQN-8C15">MQN-8C15</option>
                  <option value="ODM-6D45">ODM-6D45</option>
                  <option value="SFY-0234">SFY-0234</option>
                  <option value="MSF-5J25">MSF-5J25</option>
                  <option value="MTN-9142">MTN-9142</option>
                  <option value="HIJ-4228">HIJ-4228</option>
                  <option value="RQN-7J59">RQN-7J59</option>
                  <option value="EFW-9C42">EFW-9C42</option>
                  <option value="TXA-1A24">TXA-1A24</option>
                  <option value="MRQ-8C19">MRQ-8C19</option>
                  <option value="MRJ-3C99">MRJ-3C99</option>
                  <option value="QRE-0I89">QRE-0I89</option>
                  <option value="SGA-6C19">SGA-6C19</option>
                  <option value="MRI-2090">MRI-2090</option>
                  <option value="ODS-9254">ODS-9254</option>
                  <option value="MQC-1208">MQC-1208</option>
                  <option value="RHV-7H69">RHV-7H69</option>
                  <option value="MQR-0A12">MQR-0A12</option>
                  <option value="SFS-2J42">SFS-2J42</option>
                  <option value="MPO-2201">MPO-2201</option>
                  <option value="LAU-5E46">LAU-5E46</option>
                  <option value="MTN-6982">MTN-6982</option>
                  <option value="PPT-SN93">PPT-SN93</option>
                  <option value="0VI-2G96">0VI-2G96</option>
                  <option value="MPF-9D64">MPF-9D64</option>
                  <option value="DAJ-9J87">DAJ-9J87</option>
                  <option value="SGH-7C49">SGH-7C49</option>
                  <option value="QRD-0J81">QRD-0J81</option>
                  <option value="MQH-8401">MQH-8401</option>
                  <option value="TIT-3E27">TIT-3E27</option>
                  <option value="FSF-2J42">FSF-2J42</option>
                  <option value="MQU-4G41">MQU-4G41</option>
                  <option value="KRA-0J72">KRA-0J72</option>
                  <option value="SFT-3E90">SFT-3E90</option>
                  <option value="PPS-N93">PPS-N93</option>
                  <option value="OVI-2G96">OVI-2G96</option>
                  <option value="MSV-4709">MSV-4709</option>
                  <option value="ODO-5257">ODO-5257</option>
                  <option value="PPB-9I96">PPB-9I96</option>
                  <option value="OIV-2G96">OIV-2G96</option>
                  <option value="RQP-0G32">RQP-0G32</option>
                  <option value="SFY-2F54">SFY-2F54</option>
                  <option value="MPD-0A84">MPD-0A84</option>
                  <option value="MPW-1316">MPW-1316</option>
                  <option value="QRD-0981">QRD-0981</option>
                  <option value="QRD-6D83">QRD-6D83</option>
                  <option value="QRD-6D85">QRD-6D85</option>
                  <option value="QRD-6D87">QRD-6D87</option>
                  <option value="MQM-6040">MQM-6040</option>
                  <option value="MPZ-6125">MPZ-6125</option>
                  <option value="KUL-7G47">KUL-7G47</option>
                  <option value="MPZ-8494">MPZ-8494</option>
                  <option value="NZQ-2E94">NZQ-2E94</option>
                  <option value="OUTRO">Outro</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={editForm.frete}
                    onChange={(e) => setEditForm({ ...editForm, frete: e.target.checked })}
                  />
                  Frete
                </label>
              </div>

              <label>Turno:</label>
              <select
                value={editForm.turno}
                onChange={(e) => setEditForm({ ...editForm, turno: e.target.value })}
                style={{
                  marginBottom: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  width: "100%",
                }}
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
              </select>

              <label>Operador:</label>
              <input
                type="text"
                list="operator-options"
                value={editForm.operador}
                onChange={(e) => {
                  const match = getOperatorMatch(e.target.value)
                  if (match) {
                    setEditForm({ ...editForm, operador: match.label, turno: match.turno })
                  } else {
                    setEditForm({ ...editForm, operador: e.target.value })
                  }
                }}
                style={{ marginBottom: "10px" }}
                placeholder="Digite nome ou matrícula do operador"
              />

              <label>Motorista:</label>
              <input
                type="text"
                list="motorista-options"
                value={editForm.motorista}
                onChange={(e) => setEditForm({ ...editForm, motorista: e.target.value })}
                disabled={editForm.frete}
                style={{ marginBottom: "10px" }}
                placeholder="Digite nome ou código do motorista"
              />

              <label>Bicada:</label>
              <input
                type="number"
                value={editForm.bicada}
                onChange={(e) => setEditForm({ ...editForm, bicada: e.target.value })}
                style={{ marginBottom: "10px" }}
              />

              <label>Concorrência por Tipo:</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px" }}>1L:</label>
                  <input
                    type="number"
                    value={editForm.concorrencia1L}
                    onChange={(e) => setEditForm({ ...editForm, concorrencia1L: e.target.value })}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px" }}>600ml:</label>
                  <input
                    type="number"
                    value={editForm.concorrencia600ml}
                    onChange={(e) => setEditForm({ ...editForm, concorrencia600ml: e.target.value })}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px" }}>600ml verde:</label>
                  <input
                    type="number"
                    value={editForm.concorrencia600mlVerde}
                    onChange={(e) => setEditForm({ ...editForm, concorrencia600mlVerde: e.target.value })}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px" }}>330ml:</label>
                  <input
                    type="number"
                    value={editForm.concorrencia330ml}
                    onChange={(e) => setEditForm({ ...editForm, concorrencia330ml: e.target.value })}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Caixa de Concorrência:</label>
              <input
                type="text"
                value={editForm.caixaConcorrencia}
                onChange={(e) => setEditForm({ ...editForm, caixaConcorrencia: e.target.value })}
                style={{ marginBottom: "10px" }}
                placeholder="Ex: Caixa com 24 unidades de 330ml"
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleEditSubmit}
                  style={{
                    background: "#28a745",
                    color: "white",
                    flex: 1,
                  }}
                >
                  ✅ Salvar
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  style={{
                    background: "#dc3545",
                    color: "white",
                    flex: 1,
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <datalist id="operator-options">
          {operatorOptions.map((operador) => (
            <option key={operador} value={operador} />
          ))}
        </datalist>
        <datalist id="motorista-options">
          {driverList.map((motorista) => (
            <option key={`${motorista.matricula}-${motorista.nome}`} value={`${motorista.matricula} - ${motorista.nome}`} />
          ))}
        </datalist>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#555" }}>
          Ao continuar, você concorda com os{" "}
          <a href="/termos-de-uso.pdf" style={{ color: "#1a2a6c", fontWeight: "bold", textDecoration: "underline" }}>
            Termos de Uso
          </a>
          .
        </div>
        <div className="status" id="status"></div>
      </div>

      {showTermsPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "420px",
              textAlign: "left",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ marginBottom: "10px", color: "#1a2a6c", fontSize: "18px" }}>Termos de Uso</h3>
            <p style={{ marginBottom: "15px", fontSize: "14px", lineHeight: "1.5", color: "#333" }}>
              Para continuar, confirme que você leu e aceita os termos de uso do sistema.
            </p>
            <div style={{ marginBottom: "15px" }}>
              <a
                href="/termos-de-uso.pdf"
                style={{ color: "#1a2a6c", fontWeight: "bold", fontSize: "13px", textDecoration: "underline" }}
              >
                Ler Termos de Uso
              </a>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
              />
              Li e aceito os termos de uso.
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  window.location.href = "https://www.google.com"
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                Recusar
              </button>
              <button
                onClick={handleAcceptTerms}
                disabled={!termsChecked}
                style={{
                  background: termsChecked ? "#1a2a6c" : "#9aa3bf",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "bold",
                  width: "100%",
                  cursor: termsChecked ? "pointer" : "not-allowed",
                }}
              >
                Aceitar e continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
