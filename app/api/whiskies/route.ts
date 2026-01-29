import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  Whisky,
  searchWhiskies,
  addWhiskyToStore,
  updateWhiskyInStore,
  deleteWhiskyFromStore,
  whiskiesStore,
} from '@/lib/mockData';

let useMockData = false;
let mockDataError: string | null = null;

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    useMockData = false;
    mockDataError = null;
    return true;
  } catch (error: any) {
    console.log('[v0] Database unavailable, switching to mock data');
    useMockData = true;
    mockDataError = error?.message || 'Database connection failed';
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    const isDbAvailable = await checkDatabaseConnection();

    let data: Whisky[] = [];
    let total = 0;

    if (!isDbAvailable) {
      // Use mock data
      if (search) {
        data = searchWhiskies(search);
      } else {
        data = [...whiskiesStore];
      }
      total = data.length;
      data = data.slice(offset, offset + limit);
    } else {
      // Query database
      try {
        let sql = 'SELECT * FROM whiskies';
        const params: any[] = [];

        if (search) {
          sql += ` WHERE name LIKE ? OR distillery LIKE ? OR region LIKE ? OR description LIKE ?`;
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count
        let countSql = 'SELECT COUNT(*) as count FROM whiskies';
        if (search) {
          countSql += ` WHERE name LIKE ? OR distillery LIKE ? OR region LIKE ? OR description LIKE ?`;
        }
        const countResult: any = await query(countSql, params);
        total = countResult[0]?.count || 0;

        // Get paginated data
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        data = (await query(sql, params)) as Whisky[];
      } catch (dbError: any) {
        console.error('[v0] Database query failed:', dbError.message);
        useMockData = true;
        mockDataError = 'Failed to fetch from database';

        // Fall back to mock data
        if (search) {
          data = searchWhiskies(search);
        } else {
          data = [...whiskiesStore];
        }
        total = data.length;
        data = data.slice(offset, offset + limit);
      }
    }

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      error: mockDataError,
      usingMockData: useMockData,
    });
  } catch (error: any) {
    console.error('[v0] GET /api/whiskies error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch whiskies',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const isDbAvailable = await checkDatabaseConnection();

    let newWhisky: Whisky;

    if (!isDbAvailable) {
      // Add to mock data
      newWhisky = addWhiskyToStore(body);
    } else {
      try {
        const {
          name,
          price,
          url,
          image_url,
          image_data,
          volume,
          abv,
          description,
          distillery,
          region,
          age,
          cask_type,
          tasting_notes,
          source,
          month,
        } = body;

        const sql = `
          INSERT INTO whiskies (
            name, price, url, image_url, image_data, volume, abv, 
            description, distillery, region, age, cask_type, 
            tasting_notes, source, month
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result: any = await query(sql, [
          name,
          price,
          url,
          image_url,
          image_data || null,
          volume,
          abv,
          description,
          distillery,
          region,
          age,
          cask_type,
          tasting_notes,
          source,
          month,
        ]);

        newWhisky = {
          id: result.insertId,
          name,
          price,
          url,
          image_url,
          image_data: null,
          volume,
          abv,
          description,
          distillery,
          region,
          age,
          cask_type,
          tasting_notes,
          source,
          month,
          scraped_at: new Date().toISOString(),
        };
      } catch (dbError: any) {
        console.error('[v0] Database insert failed:', dbError.message);
        useMockData = true;
        mockDataError = 'Failed to save to database';
        newWhisky = addWhiskyToStore(body);
      }
    }

    return NextResponse.json({
      success: true,
      data: newWhisky,
      error: mockDataError,
      usingMockData: useMockData,
    });
  } catch (error: any) {
    console.error('[v0] POST /api/whiskies error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create whisky',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID is required',
        },
        { status: 400 }
      );
    }

    const isDbAvailable = await checkDatabaseConnection();

    let updatedWhisky: Whisky | null = null;

    if (!isDbAvailable) {
      // Update mock data
      updatedWhisky = updateWhiskyInStore(id, updates);
    } else {
      try {
        const setClauses: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }

        values.push(id);

        const sql = `UPDATE whiskies SET ${setClauses.join(', ')}, scraped_at = NOW() WHERE id = ?`;
        await query(sql, values);

        // Fetch updated record
        const result: any = await query('SELECT * FROM whiskies WHERE id = ?', [id]);
        updatedWhisky = result[0] || null;
      } catch (dbError: any) {
        console.error('[v0] Database update failed:', dbError.message);
        useMockData = true;
        mockDataError = 'Failed to update in database';
        updatedWhisky = updateWhiskyInStore(id, updates);
      }
    }

    if (!updatedWhisky) {
      return NextResponse.json(
        {
          success: false,
          error: 'Whisky not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedWhisky,
      error: mockDataError,
      usingMockData: useMockData,
    });
  } catch (error: any) {
    console.error('[v0] PUT /api/whiskies error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update whisky',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = parseInt(searchParams.get('id') || '0', 10);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID is required',
        },
        { status: 400 }
      );
    }

    const isDbAvailable = await checkDatabaseConnection();

    let deleted = false;

    if (!isDbAvailable) {
      // Delete from mock data
      deleted = deleteWhiskyFromStore(id);
    } else {
      try {
        await query('DELETE FROM whiskies WHERE id = ?', [id]);
        deleted = true;
      } catch (dbError: any) {
        console.error('[v0] Database delete failed:', dbError.message);
        useMockData = true;
        mockDataError = 'Failed to delete from database';
        deleted = deleteWhiskyFromStore(id);
      }
    }

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Whisky not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      error: mockDataError,
      usingMockData: useMockData,
    });
  } catch (error: any) {
    console.error('[v0] DELETE /api/whiskies error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete whisky',
      },
      { status: 500 }
    );
  }
}
