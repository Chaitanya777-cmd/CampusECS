import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'

const products = [
  { id: 1, name: 'Arduino Uno R3', category: 'Boards', price: 250, condition: 'Good', icon: '🔌', seller: 'Student A' },
  { id: 2, name: 'Ultrasonic Sensor HC-SR04', category: 'Sensors', price: 80, condition: 'Like New', icon: '📡', seller: 'Student B' },
  { id: 3, name: 'Breadboard + Jumper Wires', category: 'Components', price: 120, condition: 'Good', icon: '🔋', seller: 'Student C' },
  { id: 4, name: 'NodeMCU ESP8266', category: 'Boards', price: 180, condition: 'Good', icon: '🖥️', seller: 'Student D' },
  { id: 5, name: 'IR Sensor Module', category: 'Sensors', price: 60, condition: 'Good', icon: '📟', seller: 'Student E' },
  { id: 6, name: 'DC Motor Set', category: 'Components', price: 150, condition: 'Used', icon: '⚙️', seller: 'Student F' },
]

const categories = ['All Items', 'Boards', 'Sensors', 'Components']

function App() {
  
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showMyListings, setShowMyListings] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
const [editName, setEditName] = useState('')
const [editPrice, setEditPrice] = useState('')
const [editCategory, setEditCategory] = useState('Components')
const [editLoading, setEditLoading] = useState(false)
  
  const [category, setCategory] = useState('All Items')
  const [requests, setRequests] = useState([])
  const [showSellForm, setShowSellForm] = useState(false)
  const [customProducts, setCustomProducts] = useState([])
  const [dbProducts, setDbProducts] = useState([])
  const [form, setForm] = useState({ name: '', category: 'Components', price: '', condition: 'Good' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [notice, setNotice] = useState('')
  
  
useEffect(() => {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Session error:', error.message)
      return
    }

    setSession(data.session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession)
  })

  return () => subscription.unsubscribe()
}, [])

async function handleAuthSubmit(event) {
  event.preventDefault()
  setAuthLoading(true)
  setNotice('')

  try {
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) throw error

      if (data.session) {
        setNotice('Account created successfully!')
      } else {
        setNotice(
          'Signup successful! Please check your email to confirm your account.'
        )
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) throw error

      setNotice('Login successful!')
    }

    setAuthPassword('')
  } catch (error) {
    setNotice(error.message || 'Authentication failed. Please try again.')
  } finally {
    setAuthLoading(false)
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    setNotice(error.message)
    return
  }

  setNotice('You have logged out successfully.')
}


  useEffect(() => {
  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase products error:', error.message)
      return
    }

    const mappedProducts = (data || []).map((item) => ({
      id: `db-${item.id}`,
      name: item.title,
      category: item.category,
      user_id: item.user_id,
      price: Number(item.price),
      condition: 'Used',
      icon: '🔧',
      seller: item.seller_name || 'Campus seller',
      description: item.description || '',
      image_url: item.image_url || '',
    }))

    setDbProducts(mappedProducts)
    console.log('Supabase products loaded:', mappedProducts)
  }

  loadProducts()
}, [])

  const allProducts = [...dbProducts, ...customProducts, ...products]

 
const filteredProducts = useMemo(() => {
  return allProducts.filter((product) => {
    
    
    const matchesCategory =
      category === 'All Items' || product.category === category

    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase())

    const matchesOwner =
      !showMyListings ||
      (
        session?.user?.id &&
        String(product.user_id) === String(session.user.id)
      )

    return matchesCategory && matchesSearch && matchesOwner
  })
}, [search, category, customProducts, dbProducts, showMyListings, session])


  function sendRequest(product) {
    if (requests.includes(product.id)) {
      setNotice('You have already requested this item.')
      return
    }
    setRequests((previous) => [...previous, product.id])
    setNotice(`Request sent for ${product.name}! This is a demo request.`)
  }


async function addProduct(event) {
    if (!session?.user?.id) {
    setNotice('Please log in before listing a component.')
    return
  }
  event.preventDefault()

  const name = form.name.trim()
  const price = Number(form.price)

  if (!name || !Number.isFinite(price) || price <= 0) {
    setNotice('Please enter a valid item name and price.')
    return
  }
  let imageUrl = ''

if (selectedImage) {
  const fileExt = selectedImage.name.split('.').pop()
  const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`

  const { data: imageData, error: imageError } = await supabase
    .storage
    .from('product-images')
    .upload(filePath, selectedImage, { upsert: false })

  if (imageError) {
    console.error('Image upload error:', imageError.message)
    setNotice(`Image upload failed: ${imageError.message}`)
    return
  }

  const { data: publicData } = supabase
    .storage
    .from('product-images')
    .getPublicUrl(imageData.path)

  imageUrl = publicData.publicUrl
}

  const { data, error } = await supabase
    .from('products')
    .insert([
      {
  title: name,
  description: `${form.condition} condition`,
  price,
  category: form.category,
  user_id: session.user.id,
  image_url: imageUrl,
  
},
    ])
    .select()
    .single()

  if (error) {
    console.error('Product save error:', error.message)
    setNotice(`Could not save item: ${error.message}`)
    return
  }

  const newProduct = {
    id: `db-${data.id}`,
    name: data.title,
    category: data.category,
    price: Number(data.price),
    condition: form.condition,
    icon: '🧰',
    seller: 'You',
    description: data.description || '',
   image_url: data.image_url || imageUrl,
  }

  setDbProducts((previous) => [newProduct, ...previous])
  setShowSellForm(false)
  setCategory('All Items')
  setSearch('')
  setForm({
    name: '',
    category: 'Components',
    price: '',
    condition: 'Good',
  })
  setNotice('Item saved successfully to Supabase!')
}

async function handleEditProduct(event) {
  event.preventDefault()

  if (!session?.user?.id || !editingProduct) {
    setNotice('Please log in before editing a listing.')
    return
  }

  const name = editName.trim()
  const price = Number(editPrice)

  if (!name || !Number.isFinite(price) || price <= 0) {
    setNotice('Enter a valid product name and price.')
    return
  }

  setEditLoading(true)

  
 /* let imageUrl = ''

if (selectedImage) {
  const fileExt = selectedImage.name.split('.').pop()
  const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`

  const { data: imageData, error: imageError } = await supabase
    .storage
    .from('product-images')
    .upload(filePath, selectedImage, {
      upsert: false,
    })

  if (imageError) {
    console.error('Image upload error:', imageError.message)
    setNotice(`Image upload failed: ${imageError.message}`)
    return
  }

  const { data: publicData } = supabase
    .storage
    .from('product-images')
    .getPublicUrl(imageData.path)

  imageUrl = publicData.publicUrl
}*/

  let imageUrl = ''

if (selectedImage) {
  const fileExt = selectedImage.name.split('.').pop()
  const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`

  const { data: imageData, error: imageError } = await supabase
    .storage
    .from('product-images')
    .upload(filePath, selectedImage, {
      upsert: false,
    })

  if (imageError) {
    console.error('Image upload error:', imageError.message)
    setNotice(`Image upload failed: ${imageError.message}`)
    return
  }

  const { data: publicData } = supabase
    .storage
    .from('product-images')
    .getPublicUrl(imageData.path)

  imageUrl = publicData.publicUrl
}
  const { data, error } = await supabase
    .from('products')
    .update({
      title: name,
      price,
      category: editCategory,
      image_url: imageUrl,
    })
    .eq(
  'id',
  String(editingProduct.id).startsWith('db-')
    ? Number(String(editingProduct.id).slice(3))
    : editingProduct.id
)
    .eq('user_id', session.user.id)
    .select()
    .single()

  setEditLoading(false)

  if (error) {
    console.error('Edit product error:', error.message)
    setNotice(`Could not update listing: ${error.message}`)
    return
  }

  setDbProducts((previous) =>
    previous.map((product) =>
      String(product.id) === String(data.id)
        ? {
            ...product,
            name: data.title,
            price: Number(data.price),
            category: data.category,
          }
        : product
    )
  )

  setEditingProduct(null)
  setNotice('Listing updated successfully!')
}

async function handleDeleteProduct(product) {
  if (!session?.user?.id) {
    setNotice('Please log in first.')
    return
  }

  if (!String(product.id).startsWith('db-')) {
    setNotice('This demo item cannot be deleted.')
    return
  }

  const confirmed = window.confirm(
    `Delete "${product.name}" permanently?`
  )

  if (!confirmed) return

  const dbId = String(product.id).slice(3)

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', dbId)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) {
    console.error('Delete product error:', error.message)
    setNotice(`Could not delete listing: ${error.message}`)
    return
  }

  if (!data) {
    setNotice('Listing not found or you do not own it.')
    return
  }

  setDbProducts((previous) =>
    previous.filter(
      (item) => String(item.id) !== String(product.id)
    )
  )

  setNotice('Listing deleted successfully!')
}




  return (
    <div className="app-shell">
    
{editingProduct && (
  <div className="modal-backdrop">
    <div className="sell-modal">
      <button
        type="button"
        className="modal-close"
        onClick={() => setEditingProduct(null)}
        aria-label="Close edit form"
      >
        ×
      </button>

      <div className="eyebrow">UPDATE YOUR LISTING</div>
      <h2>Edit listing.</h2>

      <form onSubmit={handleEditProduct}>
        <label>
          Component name
          <input
            required
            maxLength={80}
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
        </label>

        <label>
          Category
          <select
            value={editCategory}
            onChange={(event) => setEditCategory(event.target.value)}
          >
            <option>Boards</option>
            <option>Sensors</option>
            <option>Components</option>
          </select>
        </label>

        <label>
          Price in ₹
          <input
            required
            type="number"
            min="1"
            max="100000"
            step="1"
            value={editPrice}
            onChange={(event) => setEditPrice(event.target.value)}
          />
        </label>

        <button
          className="button button-primary form-submit"
          type="submit"
          disabled={editLoading}
        >
          {editLoading ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  </div>
)}

      <header className="navbar">
        <a className="brand" href="#home">Campus<span>ECS.</span></a>
        
<nav className="nav-links">
<a
  href="#home"
  onClick={(event) => {
    event.preventDefault()
    setShowMyListings(false)
    setSearch('')
    setCategory('All Items')
    setShowSellForm(false)
  }}
>
  Home
</a>
  <a href="#marketplace">Marketplace</a>
  <a href="#how-it-works">How it works</a>
  {session && (
    <a
  href="#my-listings"
  onClick={(event) => {
    event.preventDefault()
    setShowMyListings(true)
    setSearch('')
    setCategory('All Items')
    setShowSellForm(false)
  }}
>
  My Listings
</a>
  )}
</nav>

        
{session ? (
  <>
    <span className="nav-user">{session.user.email}</span>
    <button
      className="button button-outline nav-sell"
      onClick={handleLogout}
    >
      Logout
    </button>
  </>
) : (
  <button
    className="button button-outline nav-sell"
    onClick={() => {
      setAuthMode('login')
      setNotice('')
      setAuthOpen(true)
    }}
  >
    Login / Sign up
  </button>
)}

      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow"><span className="status-dot" /> MADE FOR VIT-AP STUDENTS</div>
            <h1>Your next project.<br />For <span>less.</span></h1>
            <p className="hero-description">
              Buy extra ECS components from fellow students.
              Sell the equipment you no longer need. Build more, waste less.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#marketplace">Explore components ↗</a>
              
{session ? (
  <>
    <span className="nav-user">{session.user.email}</span>
    <button
      className="button button-outline nav-sell"
      onClick={handleLogout}
    >
      Logout
    </button>
  </>
) : (
  <button
    className="button button-outline nav-sell"
    onClick={() => {
      setAuthMode('login')
      setNotice('')
      setShowSellForm(false)
      setAuthEmail('')
      setAuthPassword('')
      setAuthOpen(true)
    }}
  >
    Login / Sign up
  </button>
)}

            </div>
            <div className="hero-note"><span>✳</span> Student-powered. Budget-friendly. Campus-focused.</div>
          </div>

          <div className="hero-art" aria-label="Electronics components illustration">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-glow" />
            <div className="floating-chip">ECS / LAB</div>
            <div className="board">
              <div className="board-hole hole-one" />
              <div className="board-hole hole-two" />
              <div className="board-hole hole-three" />
              <div className="board-hole hole-four" />
              <div className="board-chip">MCU</div>
              <div className="board-pin pin-one" />
              <div className="board-pin pin-two" />
              <div className="board-pin pin-three" />
              <div className="board-pin pin-four" />
              <div className="board-label">CAMPUS ECS</div>
            </div>
            <div className="floating-tag"><span>✳</span> Give components a second life.</div>
          </div>
        </section>

        <section className="stats-strip">
          <div><strong>01</strong><span>Find components</span></div>
          <div><strong>02</strong><span>Connect with students</span></div>
          <div><strong>03</strong><span>Reuse & save money</span></div>
        </section>

        <section className="market-section" id="marketplace">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE STUDENT MARKETPLACE</div>
              <h2>Find your <span>next component.</span></h2>
              <p>Explore equipment that can power your next college project.</p>
            </div>
            <span className="item-count">{filteredProducts.length} ITEMS</span>
          </div>

          <div className="search-row">
            <div className="search-box">
              <span>⌕</span>
              <input
                aria-label="Search components"
                placeholder="Search Arduino, sensors, wires..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && <button className="clear-search" onClick={() => setSearch('')}>×</button>}
            </div>
            <button className="button button-primary search-sell" onClick={() => setShowSellForm(true)}>+ List an item</button>
          </div>

          <div className="category-row">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-chip ${category === item ? 'active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
            </div>
          )}

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-visual">
                  <span className="condition-tag">{product.condition}</span>
                  {product.image_url ? (
  <img
    className="product-image"
    src={product.image_url}
    alt={product.name}
    onError={(event) => {
      event.currentTarget.style.display = 'none'
    }}
  />
) : (
  <span className="product-emoji">{product.icon}</span>
)}
                  <span className="visual-code">ECS / {String(product.id).padStart(3, '0')}</span>
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className="seller-line"><span className="seller-avatar">{product.seller.charAt(0)}</span>{product.seller}</div>
                  <div className="product-bottom">
                    <div className="price">₹{product.price}<small> / item</small></div>
                    <button
                      className={`request-button ${requests.includes(product.id) ? 'requested' : ''}`}
                      onClick={() => sendRequest(product)}
                    >
                      {requests.includes(product.id) ? 'Requested ✓' : 'Request ↗'}
                    </button>
                  </div>
                  {session?.user?.id &&
                    String(product.user_id) === String(session.user.id) && (
                      <div className="listing-actions">
                        <button
                          className="button button-outline"
                          onClick={() => {
                            setEditingProduct(product)
                            setEditName(product.name)
                            setEditPrice(String(product.price))
                            setEditCategory(product.category)
                            setNotice('')
                          }}
                        >
                          Edit Listing
                        </button>

                        {String(product.id).startsWith('db-') && (
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => handleDeleteProduct(product)}
                            style={{ marginLeft: '8px' }}
                          >
                            Delete Listing
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </article>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <span>⌕</span>
              <h3>No components found</h3>
              <p>Try another search or choose a different category.</p>
              <button className="button button-outline" onClick={() => { setSearch(''); setCategory('All Items') }}>Clear filters</button>
            </div>
          )}
          <p className="demo-note">Demo listings only · No real student accounts or transactions yet.</p>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="eyebrow">SIMPLE BY DESIGN</div>
          <h2>Three steps. <span>Less waste.</span></h2>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><h3>Find it</h3><p>Search for the components you need for your next ECS project.</p></article>
            <article className="step-card"><span className="step-number">02</span><h3>Send a request</h3><p>Contact the seller through a future verified student request system.</p></article>
            <article className="step-card"><span className="step-number">03</span><h3>Reuse it</h3><p>Arrange a campus handover and give unused equipment a new purpose.</p></article>
          </div>
        </section>

        <section className="bottom-cta">
          <div><div className="eyebrow">HAVE EXTRA EQUIPMENT?</div><h2>Someone needs what <span>you don't.</span></h2></div>
          <button className="button button-primary" onClick={() => setShowSellForm(true)}>List a component ↗</button>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home">Campus<span>ECS.</span></a>
        <p>Built for student projects. Designed for reuse.</p>
        <span>VIT-AP · STUDENT MARKETPLACE CONCEPT</span>
      </footer>
      
{authOpen && (
  <div
    className="modal-backdrop"
    onClick={() => setAuthOpen(false)}
  >
    <div
      className="sell-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="modal-close"
        onClick={() => setAuthOpen(false)}
        aria-label="Close login form"
      >
        ×
      </button>

      <div className="eyebrow">CAMPUS ECS ACCOUNT</div>
      <h2 id="auth-title">
        {authMode === 'signup' ? 'Create account' : 'Welcome back'}
      </h2>
      <p>Sign in to connect with your campus community.</p>

      <form onSubmit={handleAuthSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={
              authMode === 'signup' ? 'new-password' : 'current-password'
            }
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        {notice && <p role="status">{notice}</p>}

        <button
          className="button button-primary form-submit"
          type="submit"
          disabled={authLoading}
        >
          {authLoading
            ? 'Please wait...'
            : authMode === 'signup'
              ? 'Create account'
              : 'Login'}
        </button>
      </form>

      <p>
        {authMode === 'login'
          ? "Don't have an account?"
          : 'Already have an account?'}
        {' '}
        <button
          type="button"
          className="button button-outline"
          onClick={() => {
            setAuthMode(authMode === 'login' ? 'signup' : 'login')
            setNotice('')
          }}
        >
          {authMode === 'login' ? 'Sign up' : 'Login'}
        </button>
      </p>
    </div>
  </div>
)}


      {showSellForm && (
        <div className="modal-backdrop" onClick={() => setShowSellForm(false)}>
          <div className="sell-modal" role="dialog" aria-modal="true" aria-labelledby="sell-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSellForm(false)} aria-label="Close form">×</button>
            <div className="eyebrow">GIVE IT A SECOND LIFE</div>
            <h2 id="sell-title">List a component.</h2>
           <p>Your component will be saved to the CampusECS database.</p>
            <form onSubmit={addProduct}>
              <label>Component name<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Arduino Uno R3" /></label>
              <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Boards</option><option>Sensors</option><option>Components</option></select></label>
              <label>Price in ₹<input required type="number" min="1" max="100000" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="e.g. 250" /></label>
              <label>Condition<select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}><option>Good</option><option>Like New</option><option>Used</option></select></label>
              <label>
  Product Image
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={(event) => {
      const file = event.target.files?.[0]
      setSelectedImage(file || null)
    }}
  />
</label>
              <button className="button button-primary form-submit" type="submit">Add demo listing ↗</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App