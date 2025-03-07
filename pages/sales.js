import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProtectedRoute from "../lib/protectedRoute";
import { useRouter } from "next/router";

function SalesPage() {
  // State for sales data
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  
  // State for editing
  const [editingSale, setEditingSale] = useState(null);
  const [editFormData, setEditFormData] = useState({
    contract_number: "",
    sale_amount: 0
  });
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from("agents")
          .select("role")
          .eq("email", user.email)
          .single();
          
        if (data && !error) {
          if (data.role === "admin") {
            setIsAdmin(true);
          } else {
            // Redirect non-admin users
            alert("You don't have permission to access this page.");
            router.push("/dashboard");
          }
        }
      }
    };
    
    checkUserRole();
  }, [router]);

  // Set initial date range
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formattedToday = today.toISOString().split("T")[0];

    setStartDate(formattedToday);
    setEndDate(formattedToday);
    setSelectedDateRange("today");
  }, []);

  // Fetch sales data when date range changes
  useEffect(() => {
    if (startDate && endDate && isAdmin) {
      fetchSales();
    }
  }, [startDate, endDate, isAdmin]);

  // Function to Set Date Range Based on Dropdown Selection
  const handleDateRangeChange = (value) => {
    setSelectedDateRange(value);

    const today = new Date();
    let newStartDate, newEndDate;

    switch (value) {
      case "today":
        newStartDate = today;
        newEndDate = today;
        break;
      case "yesterday":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 1);
        newEndDate = newStartDate;
        break;
      case "last_7_days":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 7);
        newEndDate = today;
        break;
      case "last_30_days":
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 30);
        newEndDate = today;
        break;
      default:
        newStartDate = "";
        newEndDate = "";
    }

    setStartDate(newStartDate ? newStartDate.toISOString().split("T")[0] : "");
    setEndDate(newEndDate ? newEndDate.toISOString().split("T")[0] : "");
  };

  // Fetch sales data with agent names
  const fetchSales = async () => {
    setLoading(true);
    
    try {
      // First, fetch all sales for the selected date range
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .gte("sale_date", startDate)
        .lte("sale_date", endDate);
        
      if (salesError) throw salesError;
      
      // Then fetch agent information to get names
      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select("email, name, store_number");
        
      if (agentsError) throw agentsError;
      
      // Create a lookup map for agent information
      const agentMap = {};
      agentsData.forEach(agent => {
        agentMap[agent.email] = {
          name: agent.name,
          store_number: agent.store_number
        };
      });
      
      // Combine sales data with agent information
      const combinedData = salesData.map(sale => ({
        ...sale,
        name: agentMap[sale.email]?.name || "Unknown",
        store_number: agentMap[sale.email]?.store_number || 0
      }));
      
      console.log("✅ Sales data fetched:", combinedData);
      setSales(combinedData);
      setFilteredSales(combinedData);
    } catch (error) {
      console.error("❌ Error fetching sales data:", error);
      alert("Error fetching sales data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter sales based on search and store filter
  useEffect(() => {
    let filtered = sales;

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.name?.toLowerCase().includes(lowercasedQuery) ||
          sale.email?.toLowerCase().includes(lowercasedQuery) ||
          sale.contract_number?.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (storeFilter) {
      filtered = filtered.filter(
        (sale) => sale.store_number?.toString() === storeFilter
      );
    }

    setFilteredSales(filtered);
  }, [searchQuery, storeFilter, sales]);

  // Get unique store numbers for filter dropdown
  const uniqueStores = [...new Set(sales.map((sale) => sale.store_number))].filter(Boolean);

  // Edit sale handlers
  const handleEditClick = (sale) => {
    setEditingSale(sale.id);
    setEditFormData({
      contract_number: sale.contract_number || "",
      sale_amount: sale.sale_amount || 0
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === "sale_amount" ? parseFloat(value) : value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("sales")
        .update({
          contract_number: editFormData.contract_number,
          sale_amount: editFormData.sale_amount
        })
        .eq("id", editingSale);
        
      if (error) throw error;
      
      // Refresh the data
      fetchSales();
      setEditingSale(null);
      alert("Sale updated successfully!");
    } catch (error) {
      console.error("❌ Error updating sale:", error);
      alert("Error updating sale. Please try again.");
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingSale(null);
  };

  // Delete sale
  const handleDeleteClick = async (id) => {
    if (window.confirm("Are you sure you want to delete this sale? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from("sales")
          .delete()
          .eq("id", id);
          
        if (error) throw error;
        
        // Refresh the data
        fetchSales();
        alert("Sale deleted successfully!");
      } catch (error) {
        console.error("❌ Error deleting sale:", error);
        alert("Error deleting sale. Please try again.");
      }
    }
  };

  if (!isAdmin) {
    return <div className="loading">Checking permissions...</div>;
  }

  return (
    <div className="sales-container">
      <h1>Sales Management</h1>
      <p className="admin-note">This page is only accessible to admins.</p>

      {/* Filters Section */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name, email, or contract..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />

        <select
          value={selectedDateRange}
          onChange={(e) => handleDateRangeChange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
        </select>

        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
        >
          <option value="">All Stores</option>
          {uniqueStores.map((store) => (
            <option key={store} value={store}>
              Store {store}
            </option>
          ))}
        </select>

        <div className="date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Store #</th>
              <th>Contract Number</th>
              <th>Sale Amount</th>
              <th>Sale Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading-cell">
                  Loading sales data...
                </td>
              </tr>
            ) : filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  {editingSale === sale.id ? (
                    // Edit form row
                    <>
                      <td>{sale.name}</td>
                      <td>{sale.store_number}</td>
                      <td>
                        <input
                          type="text"
                          name="contract_number"
                          value={editFormData.contract_number}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="sale_amount"
                          value={editFormData.sale_amount}
                          onChange={handleEditChange}
                          step="0.01"
                        />
                      </td>
                      <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                      <td className="action-buttons">
                        <button onClick={handleEditSubmit} className="save-btn">
                          Save
                        </button>
                        <button onClick={handleCancelEdit} className="cancel-btn">
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    // Regular display row
                    <>
                      <td>{sale.name}</td>
                      <td>{sale.store_number}</td>
                      <td>{sale.contract_number}</td>
                      <td>${sale.sale_amount.toFixed(2)}</td>
                      <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                      <td className="action-buttons">
                        <button
                          onClick={() => handleEditClick(sale)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sale.id)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  No sales found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Use ProtectedRoute Higher-Order Component to protect the page
export default ProtectedRoute(SalesPage);
