# StockMaster - Full Stack Inventory Management System

A production-ready inventory management system built with React, Supabase, and PostgreSQL. Features comprehensive stock tracking, multi-warehouse support, role-based access control, and real-time alerts.

## Features

### Authentication & Authorization
- Secure email/password authentication
- Role-based access control (Admin, Manager, Staff)
- User profile management
- Protected routes and operations

### Dashboard
- Real-time inventory metrics
- Total products and stock levels
- Low stock alerts counter
- Pending operations tracking (Receipts, Deliveries, Transfers)
- Recent activity feed
- Quick action shortcuts

### Product Management
- Complete CRUD operations
- SKU tracking
- Category organization
- Multiple unit types (pcs, kg, ltr, box, carton, dozen, meter)
- Reorder level configuration
- Product search and filtering
- Active/inactive status management

### Warehouse Management
- Multiple warehouse locations
- Warehouse codes and locations
- Manager assignment
- Active/inactive status
- Stock distribution across warehouses

### Stock Operations

#### Receipts
- Record incoming stock
- Supplier information
- Unit cost tracking
- Pending/completed status workflow
- Automatic stock level updates

#### Deliveries
- Track outgoing stock
- Customer information
- Reduce inventory automatically
- Status management

#### Transfers
- Move stock between warehouses
- Two-stage verification
- Complete transaction history
- Automatic ledger entries

#### Adjustments
- Manual stock corrections
- Reason tracking
- Positive/negative adjustments
- Immediate stock updates

### Stock Ledger
- Complete transaction history
- All stock movements tracked
- Reference number linking
- Before/after quantities
- User attribution
- Timestamp tracking

### Low Stock Alerts
- Automatic alert generation
- Reorder level monitoring
- Active/acknowledged status
- Alert acknowledgment system
- Per-warehouse tracking

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Row Level Security** - Data protection
- **Supabase Auth** - Authentication

## Database Schema

### Core Tables
- `user_profiles` - User information and roles
- `categories` - Product categories
- `products` - Product catalog
- `warehouses` - Warehouse locations
- `stock` - Current stock levels per warehouse

### Operations Tables
- `stock_receipts` - Incoming stock records
- `stock_deliveries` - Outgoing stock records
- `stock_transfers` - Inter-warehouse transfers
- `stock_adjustments` - Manual corrections

### Tracking Tables
- `stock_ledger` - Complete transaction history
- `audit_logs` - System-wide audit trail
- `low_stock_alerts` - Reorder notifications

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run database migrations (already applied via Supabase MCP)

5. Start the development server:
   ```bash
   npm run dev
   ```

### First Time Setup

1. Sign up for a new account
2. Your first account will have 'staff' role by default
3. Update your role to 'admin' in the database to access all features:
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE id = 'your_user_id';
   ```

## User Roles

### Admin
- Full system access
- User management
- All CRUD operations
- View audit logs
- System configuration

### Manager
- Product management
- Stock operations
- Warehouse management (assigned warehouses)
- View reports and alerts
- Acknowledge alerts

### Staff
- Create receipts and deliveries
- View inventory
- View stock ledger
- Limited write access

## Security Features

### Row Level Security (RLS)
- All tables protected with RLS policies
- Role-based data access
- User can only see authorized data
- Automatic policy enforcement

### Data Protection
- Passwords hashed by Supabase Auth
- API keys never exposed to client
- Secure session management
- HTTPS-only communication

### Audit Trail
- All operations logged
- User attribution on all changes
- Timestamp tracking
- Complete transaction history

## API Structure

The application uses Supabase client SDK for all database operations:

- **Authentication**: `supabase.auth.*`
- **Database**: `supabase.from('table_name').*`
- **Real-time**: Available for future enhancements

## Development

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Key Features Implementation

### Automatic Stock Updates
- Receipts add to stock when completed
- Deliveries reduce stock when completed
- Transfers move stock between warehouses
- Adjustments immediately update stock

### Ledger System
- Every stock operation creates ledger entry
- Tracks quantity before and after
- Links to source transaction
- Provides complete audit trail

### Low Stock Monitoring
- Database trigger checks stock levels
- Automatic alert generation
- Per-warehouse, per-product tracking
- Prevents duplicate alerts

### Operation Workflow
1. Create operation (pending status)
2. Review and verify
3. Complete operation
4. Stock automatically updated
5. Ledger entry created
6. Alerts checked

## Future Enhancements

- Reports and analytics
- Barcode scanning
- Export to CSV/Excel
- Email notifications
- Mobile app
- Multi-language support
- Advanced search and filters
- Batch operations
- Supplier management
- Purchase orders

## License

This is a demonstration project for educational purposes.

## Support

For issues and questions, please refer to the documentation or create an issue in the repository.
