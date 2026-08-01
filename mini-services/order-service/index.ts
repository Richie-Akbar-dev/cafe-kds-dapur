import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Kitchen joins to listen for new orders
  socket.on('kitchen-join', () => {
    socket.join('kitchen')
    console.log(`Kitchen display joined: ${socket.id}`)
  })

  // Customer joins a table room
  socket.on('customer-join', (tableNumber: number) => {
    socket.join(`table-${tableNumber}`)
    console.log(`Customer at table ${tableNumber} joined: ${socket.id}`)
  })

  // Broadcast new order to kitchen
  socket.on('new-order', (order: any) => {
    console.log(`New order from table ${order.tableNumber}: ${order.id}`)
    io.to('kitchen').emit('new-order', order)
  })

  // Broadcast order status update to customer
  socket.on('order-status-update', (data: { orderId: string; status: string; tableNumber: number }) => {
    console.log(`Order ${data.orderId} status updated to: ${data.status}`)
    io.to(`table-${data.tableNumber}`).emit('order-status', data)
    // Also broadcast to all kitchen displays
    io.to('kitchen').emit('order-status-update', data)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Order WebSocket service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
