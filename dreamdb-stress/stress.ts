import { DreamDB } from "@yakshith/dreamdb";
import faker from "faker";

// Configuration
const CONFIG = {
    NUM_USERS: 1000,        // Number of users to insert
    NUM_PRODUCTS: 500,      // Number of products to insert
    NUM_ORDERS: 2000,       // Number of orders to insert
    BATCH_SIZE: 100,        // Insert in batches to monitor progress
    QUERY_COUNT: 50,        // Number of queries to run
    DB_PATH: "stress_test.db",
};

interface Stats {
    inserts: {
        total: number;
        completed: number;
        failed: number;
        times: number[];
    };
    queries: {
        total: number;
        completed: number;
        failed: number;
        times: number[];
    };
    startTime: number;
    endTime?: number;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
}

function calculateStats(times: number[]) {
    if (times.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    
    return {
        avg: sum / times.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.50)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
    };
}

function printStats(stats: Stats) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 STRESS TEST RESULTS");
    console.log("=".repeat(80));
    
    const totalTime = (stats.endTime || Date.now()) - stats.startTime;
    console.log(`\n⏱️  Total Test Duration: ${formatDuration(totalTime)}`);
    
    // Insert stats
    console.log(`\n📥 INSERT STATISTICS`);
    console.log(`   Total: ${stats.inserts.total}`);
    console.log(`   Completed: ${stats.inserts.completed}`);
    console.log(`   Failed: ${stats.inserts.failed}`);
    
    if (stats.inserts.times.length > 0) {
        const insertStats = calculateStats(stats.inserts.times);
        console.log(`\n   Performance:`);
        console.log(`     Average: ${formatDuration(insertStats.avg)}`);
        console.log(`     Min: ${formatDuration(insertStats.min)}`);
        console.log(`     Max: ${formatDuration(insertStats.max)}`);
        console.log(`     P50: ${formatDuration(insertStats.p50)}`);
        console.log(`     P95: ${formatDuration(insertStats.p95)}`);
        console.log(`     P99: ${formatDuration(insertStats.p99)}`);
        
        const throughput = (stats.inserts.completed / (totalTime / 1000)).toFixed(2);
        console.log(`     Throughput: ${throughput} inserts/sec`);
    }
    
    // Query stats
    console.log(`\n🔍 QUERY STATISTICS`);
    console.log(`   Total: ${stats.queries.total}`);
    console.log(`   Completed: ${stats.queries.completed}`);
    console.log(`   Failed: ${stats.queries.failed}`);
    
    if (stats.queries.times.length > 0) {
        const queryStats = calculateStats(stats.queries.times);
        console.log(`\n   Performance:`);
        console.log(`     Average: ${formatDuration(queryStats.avg)}`);
        console.log(`     Min: ${formatDuration(queryStats.min)}`);
        console.log(`     Max: ${formatDuration(queryStats.max)}`);
        console.log(`     P50: ${formatDuration(queryStats.p50)}`);
        console.log(`     P95: ${formatDuration(queryStats.p95)}`);
        console.log(`     P99: ${formatDuration(queryStats.p99)}`);
        
        const throughput = (stats.queries.completed / (totalTime / 1000)).toFixed(2);
        console.log(`     Throughput: ${throughput} queries/sec`);
    }
    
    console.log("\n" + "=".repeat(80) + "\n");
}

async function generateUser() {
    return {
        name: faker.name.findName(),
        email: faker.internet.email(),
        age: faker.datatype.number({ min: 18, max: 80 }),
        city: faker.address.city(),
        country: faker.address.country(),
        bio: faker.lorem.paragraph(),
        notes: faker.lorem.sentence(),
        lastActive: faker.date.past().toISOString(),
        isPremium: faker.datatype.boolean(),
        subscriptionType: faker.random.arrayElement(["free", "basic", "premium", "enterprise"]),
    };
}

async function generateProduct() {
    return {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price(10, 1000, 2)),
        category: faker.commerce.department(),
        brand: faker.company.companyName(),
        inStock: faker.datatype.boolean(),
        rating: parseFloat(faker.finance.amount(1, 5, 1)),
        reviewCount: faker.datatype.number({ min: 0, max: 10000 }),
    };
}

async function generateOrder(userId: string, productId: string) {
    return {
        userId: userId,
        productId: productId,
        quantity: faker.datatype.number({ min: 1, max: 10 }),
        total: parseFloat(faker.commerce.price(20, 5000, 2)),
        status: faker.random.arrayElement(["pending", "processing", "shipped", "delivered", "cancelled"]),
        orderDate: faker.date.past().toISOString(),
        shippingAddress: faker.address.streetAddress(),
    };
}

async function insertBatch(
    db: DreamDB,
    table: string,
    generator: () => Promise<any>,
    count: number,
    stats: Stats
): Promise<void> {
    const batchStart = Date.now();
    
    for (let i = 0; i < count; i++) {
        try {
            const startTime = Date.now();
            const data = await generator();
            await db.insert(table, data);
            const duration = Date.now() - startTime;
            
            stats.inserts.times.push(duration);
            stats.inserts.completed++;
            
            if ((i + 1) % 50 === 0) {
                console.log(`   ✓ Inserted ${i + 1}/${count} into ${table}...`);
            }
        } catch (error) {
            stats.inserts.failed++;
            console.error(`   ✗ Failed to insert into ${table}:`, error);
        }
    }
    
    const batchDuration = Date.now() - batchStart;
    console.log(`   ✅ Completed ${count} inserts into ${table} in ${formatDuration(batchDuration)}`);
}

async function runStressTest() {
    console.log("🚀 Starting DreamDB Stress Test");
    console.log("=".repeat(80));
    console.log(`Configuration:`);
    console.log(`  Users: ${CONFIG.NUM_USERS}`);
    console.log(`  Products: ${CONFIG.NUM_PRODUCTS}`);
    console.log(`  Orders: ${CONFIG.NUM_ORDERS}`);
    console.log(`  Queries: ${CONFIG.QUERY_COUNT}`);
    console.log("=".repeat(80) + "\n");

    // Remove existing database
    try {
        const fs = await import("fs/promises");
        await fs.unlink(CONFIG.DB_PATH).catch(() => {});
    } catch (e) {
        // Ignore if file doesn't exist
    }

    const db = new DreamDB({ path: CONFIG.DB_PATH });
    const stats: Stats = {
        inserts: { total: 0, completed: 0, failed: 0, times: [] },
        queries: { total: CONFIG.QUERY_COUNT, completed: 0, failed: 0, times: [] },
        startTime: Date.now(),
    };

    try {
        // Store generated IDs for later use
        const userIds: string[] = [];
        const productIds: string[] = [];

        // Insert Users
        console.log("\n📥 Phase 1: Inserting Users...");
        stats.inserts.total += CONFIG.NUM_USERS;
        for (let i = 0; i < CONFIG.NUM_USERS; i++) {
            try {
                const startTime = Date.now();
                const user = await generateUser();
                const id = await db.insert("users", user);
                userIds.push(id);
                const duration = Date.now() - startTime;
                
                stats.inserts.times.push(duration);
                stats.inserts.completed++;
                
                if ((i + 1) % 100 === 0) {
                    console.log(`   ✓ Inserted ${i + 1}/${CONFIG.NUM_USERS} users...`);
                }
            } catch (error) {
                stats.inserts.failed++;
                console.error(`   ✗ Failed to insert user ${i + 1}:`, error);
            }
        }
        console.log(`   ✅ Completed ${CONFIG.NUM_USERS} user inserts`);

        // Insert Products
        console.log("\n📥 Phase 2: Inserting Products...");
        stats.inserts.total += CONFIG.NUM_PRODUCTS;
        for (let i = 0; i < CONFIG.NUM_PRODUCTS; i++) {
            try {
                const startTime = Date.now();
                const product = await generateProduct();
                const id = await db.insert("products", product);
                productIds.push(id);
                const duration = Date.now() - startTime;
                
                stats.inserts.times.push(duration);
                stats.inserts.completed++;
                
                if ((i + 1) % 100 === 0) {
                    console.log(`   ✓ Inserted ${i + 1}/${CONFIG.NUM_PRODUCTS} products...`);
                }
            } catch (error) {
                stats.inserts.failed++;
                console.error(`   ✗ Failed to insert product ${i + 1}:`, error);
            }
        }
        console.log(`   ✅ Completed ${CONFIG.NUM_PRODUCTS} product inserts`);

        // Insert Orders (randomly link users and products)
        console.log("\n📥 Phase 3: Inserting Orders...");
        stats.inserts.total += CONFIG.NUM_ORDERS;
        for (let i = 0; i < CONFIG.NUM_ORDERS; i++) {
            try {
                const startTime = Date.now();
                const userId = userIds[Math.floor(Math.random() * userIds.length)];
                const productId = productIds[Math.floor(Math.random() * productIds.length)];
                const order = await generateOrder(userId, productId);
                await db.insert("orders", order);
                const duration = Date.now() - startTime;
                
                stats.inserts.times.push(duration);
                stats.inserts.completed++;
                
                if ((i + 1) % 200 === 0) {
                    console.log(`   ✓ Inserted ${i + 1}/${CONFIG.NUM_ORDERS} orders...`);
                }
            } catch (error) {
                stats.inserts.failed++;
                console.error(`   ✗ Failed to insert order ${i + 1}:`, error);
            }
        }
        console.log(`   ✅ Completed ${CONFIG.NUM_ORDERS} order inserts`);

        // Test Queries
        console.log("\n🔍 Phase 4: Running Queries...");
        const queryTemplates = [
            "users who are premium subscribers",
            "expensive products above 500",
            "recent orders that were delivered",
            "users from New York",
            "products in electronics category",
            "premium users with high activity",
            "pending orders that need processing",
            "users who haven't been active recently",
            "best rated products",
            "orders with high total amount",
            "young users under 30",
            "products that are out of stock",
            "users from Europe",
            "orders shipped last week",
            "expensive premium products",
        ];

        for (let i = 0; i < CONFIG.QUERY_COUNT; i++) {
            try {
                const query = queryTemplates[i % queryTemplates.length];
                const startTime = Date.now();
                const results = await db.query(query, 5);
                const duration = Date.now() - startTime;
                
                stats.queries.times.push(duration);
                stats.queries.completed++;
                
                if ((i + 1) % 10 === 0) {
                    console.log(`   ✓ Completed ${i + 1}/${CONFIG.QUERY_COUNT} queries... (found ${results.length} results)`);
                }
            } catch (error) {
                stats.queries.failed++;
                console.error(`   ✗ Query ${i + 1} failed:`, error);
            }
        }
        console.log(`   ✅ Completed ${CONFIG.QUERY_COUNT} queries`);

    } catch (error) {
        console.error("\n❌ Stress test failed:", error);
        throw error;
    } finally {
        stats.endTime = Date.now();
        printStats(stats);
    }
}

// Run the stress test
runStressTest()
    .then(() => {
        console.log("✅ Stress test completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Stress test failed:", error);
        process.exit(1);
    });

